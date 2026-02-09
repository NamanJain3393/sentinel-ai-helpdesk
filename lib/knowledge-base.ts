/**
 * Self-Learning Knowledge Base System
 * Automatically loads and refreshes solutions from multiple sources
 * 
 * ⚠️ SERVER-ONLY: This module uses Node.js fs/path and must only be imported in API routes
 */

import fs from "fs";
import path from "path";
import Fuse from "fuse.js";

// Ensure data directory exists (only on server)
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface KnowledgeEntry {
  issue: string;
  solution: string;
  source?: string; // 'csv', 'json', 'supabase', 'admin'
  confidence?: number;
  createdAt?: string;
}

// In-memory cache for knowledge base
let knowledgeBaseCache: KnowledgeEntry[] = [];
let lastReloadTime = 0;
const RELOAD_INTERVAL = 30000; // 30 seconds
const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "data", "solutions.json");
const CSV_PATH = path.join(process.cwd(), "data", "Monthly_Report.csv");

// Fuse.js instance for fuzzy search
let fuseInstance: Fuse<KnowledgeEntry> | null = null;

/**
 * Load knowledge base from all sources
 */
export async function loadKnowledgeBase(): Promise<KnowledgeEntry[]> {
  const now = Date.now();
  
  // Return cached data if recently loaded
  if (knowledgeBaseCache.length > 0 && (now - lastReloadTime) < RELOAD_INTERVAL) {
    return knowledgeBaseCache;
  }

  const entries: KnowledgeEntry[] = [];

  // 1. Load from solutions.json
  try {
    if (fs.existsSync(KNOWLEDGE_BASE_PATH)) {
      const fileContent = fs.readFileSync(KNOWLEDGE_BASE_PATH, "utf-8");
      const jsonData = JSON.parse(fileContent);
      
      if (Array.isArray(jsonData)) {
        jsonData.forEach((item: any) => {
          entries.push({
            issue: item.issue || item.question || "",
            solution: item.solution || "",
            source: "json",
            createdAt: item.created_at || new Date().toISOString(),
          });
        });
      }
    }
  } catch (error) {
    console.warn("Failed to load solutions.json:", error);
  }

  // 2. Load from CSV (Monthly_Report.csv)
  try {
    if (fs.existsSync(CSV_PATH)) {
      const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
      const lines = csvContent.split("\n");
      const headers = lines[0]?.split(",") || [];
      
      const problemIndex = headers.findIndex((h) => 
        h.toLowerCase().includes("problem") || h.toLowerCase().includes("issue")
      );
      const solutionIndex = headers.findIndex((h) => 
        h.toLowerCase().includes("solution") || h.toLowerCase().includes("resolution")
      );

      if (problemIndex >= 0 && solutionIndex >= 0) {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(",");
          const problem = values[problemIndex]?.trim() || "";
          const solution = values[solutionIndex]?.trim() || "";

          if (problem && solution) {
            entries.push({
              issue: problem,
              solution: solution,
              source: "csv",
            });
          }
        }
      }
    }
  } catch (error) {
    console.warn("Failed to load CSV:", error);
  }

  // 3. Load from Supabase (if available)
  try {
    const { getSupabaseClient } = await import("@/lib/db");
    const supabase = getSupabaseClient();
    
    if (supabase) {
      const { data, error } = await supabase
        .from("solutions")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        data.forEach((item: any) => {
          entries.push({
            issue: item.question || item.issue || "",
            solution: item.solution || "",
            source: "supabase",
            createdAt: item.created_at,
          });
        });
      }
    }
  } catch (error) {
    // Supabase not available, continue without it
    console.warn("Supabase unavailable for knowledge base:", error);
  }

  // Update cache
  knowledgeBaseCache = entries;
  lastReloadTime = now;

  // Rebuild Fuse.js index
  fuseInstance = new Fuse(entries, {
    keys: ["issue", "solution"],
    threshold: 0.4, // 0 = exact match, 1 = match anything
    includeScore: true,
    minMatchCharLength: 3,
  });

  console.log(`✅ Knowledge base loaded: ${entries.length} entries`);
  return entries;
}

/**
 * Force reload knowledge base (call after admin adds solution)
 */
export async function reloadKnowledgeBase(): Promise<void> {
  lastReloadTime = 0; // Force reload
  await loadKnowledgeBase();
}

/**
 * Search knowledge base for similar issues
 */
export async function searchKnowledgeBase(
  query: string,
  minScore: number = 0.7
): Promise<KnowledgeEntry | null> {
  await loadKnowledgeBase();

  if (!fuseInstance || knowledgeBaseCache.length === 0) {
    return null;
  }

  const results = fuseInstance.search(query, { limit: 1 });
  
  if (results.length > 0) {
    const bestMatch = results[0];
    // Fuse.js returns score where 0 = perfect match, 1 = no match
    // Convert to similarity score (1 - score)
    const similarity = 1 - bestMatch.score;
    
    if (similarity >= minScore) {
      return bestMatch.item;
    }
  }

  return null;
}

/**
 * Add new solution to knowledge base (called when admin resolves ticket)
 */
export async function addSolutionToKnowledgeBase(
  issue: string,
  solution: string
): Promise<void> {
  // 1. Add to solutions.json
  try {
    let solutions: any[] = [];
    
    if (fs.existsSync(KNOWLEDGE_BASE_PATH)) {
      const fileContent = fs.readFileSync(KNOWLEDGE_BASE_PATH, "utf-8");
      solutions = JSON.parse(fileContent);
    }

    // Check if solution already exists
    const exists = solutions.some(
      (s: any) =>
        s.issue?.toLowerCase() === issue.toLowerCase() ||
        s.question?.toLowerCase() === issue.toLowerCase()
    );

    if (!exists) {
      solutions.push({
        issue,
        solution,
        created_at: new Date().toISOString(),
        source: "admin",
      });

      fs.writeFileSync(
        KNOWLEDGE_BASE_PATH,
        JSON.stringify(solutions, null, 2),
        "utf-8"
      );
    }
  } catch (error) {
    console.error("Failed to write to solutions.json:", error);
  }

  // 2. Add to Supabase (if available)
  try {
    const { getSupabaseClient } = await import("@/lib/db");
    const supabase = getSupabaseClient();
    
    if (supabase) {
      const { data, error } = await supabase.from("solutions").insert({
        question: issue.trim(),
        solution: solution.trim(),
      }).select().single();
      
      if (error) {
        // If duplicate, try to update instead
        if (error.code === "23505" || error.message?.includes("duplicate")) {
          const { error: updateError } = await supabase
            .from("solutions")
            .update({ 
              solution: solution.trim(),
              updated_at: new Date().toISOString()
            })
            .eq("question", issue.trim());
          
          if (updateError) {
            console.warn("Failed to update existing solution in Supabase:", updateError);
          } else {
            console.log("✅ Updated existing solution in Supabase");
          }
        } else {
          console.warn("Failed to add to Supabase:", error);
        }
      } else {
        console.log("✅ Solution added to Supabase:", data?.id);
      }
    }
  } catch (error) {
    console.warn("Failed to add to Supabase:", error);
  }

  // 3. Force reload
  await reloadKnowledgeBase();
}

/**
 * Check if similar issue exists before creating ticket
 */
export async function checkDuplicateIssue(
  userQuery: string
): Promise<KnowledgeEntry | null> {
  return await searchKnowledgeBase(userQuery, 0.6); // Lower threshold for duplicate check
}

// Auto-reload on file changes (Node.js only)
if (typeof window === "undefined") {
  // Watch for file changes
  try {
    if (fs.existsSync(KNOWLEDGE_BASE_PATH)) {
      fs.watchFile(KNOWLEDGE_BASE_PATH, { interval: 5000 }, async () => {
        console.log("📚 Knowledge base file changed, reloading...");
        await reloadKnowledgeBase();
      });
    }
  } catch (error) {
    console.warn("File watching not available:", error);
  }
}

// Initial load
loadKnowledgeBase().catch(console.error);

