import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Singleton Supabase client for server-side usage (Next.js App Router)
let supabaseSingleton: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseSingleton) return supabaseSingleton;

  let url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use service role key for server operations (bypasses RLS)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fix common mistake: User copied Dashboard URL instead of API URL
  if (url && url.includes("supabase.com/dashboard/project/")) {
    const projectId = url.split("project/")[1].split("/")[0];
    url = `https://${projectId}.supabase.co`;
    console.log("⚠️ Detected Dashboard URL in env. Auto-corrected to:", url);
  }

  if (!url || !key) {
    const missing = [];
    if (!url) missing.push("SUPABASE_URL");
    if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    console.error(`❌ Missing environment variables: ${missing.join(", ")}`);
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  supabaseSingleton = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return supabaseSingleton;
}

// =============================
// Types mapped to DB schema
// =============================

export type IssueStatus = "open" | "investigating" | "resolved" | "closed" | (string & {});

export interface Issue {
  id: number;
  company: string;
  model: string;
  issue_type: string;
  description: string;
  status: IssueStatus;
  ai_generated?: boolean;
  created_at: string; // ISO timestamp from Postgres
  updated_at: string; // ISO timestamp from Postgres
}

export type NewIssue = Omit<Issue, "id" | "created_at" | "updated_at">;

export interface Solution {
  id: string; // UUID from database
  question: string;
  solution: string;
  confidence?: number;
  created_at: string; // ISO timestamp
  updated_at?: string; // ISO timestamp
}

export type NewSolution = Omit<Solution, "id" | "created_at" | "updated_at">;

export interface Metrics {
  id: number;
  csat: number; // Customer satisfaction
  dsat: number; // Dissatisfaction
  mttr: number; // Mean time to resolution
  mtbr: number; // Mean time between recurrences
  avg_response_time: number;
  total_issues: number;
  created_at: string; // ISO timestamp
}

export type NewMetrics = Omit<Metrics, "id" | "created_at">;

// Chat history (soft-typed to avoid schema coupling)
export interface ChatMessage {
  id?: string | number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export async function logChatMessage(msg: ChatMessage): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("chat_history").insert({
      role: msg.role,
      content: msg.content,
    });
    if (error) throw error;
    console.log("✅ Chat saved to DB");
  } catch (err) {
    console.error("❌ Failed to log chat message:", err);
  }
}

// =============================
// Query helpers
// =============================

// Issues
export async function getIssueById(id: number): Promise<Issue | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Issue) ?? null;
}

export interface ListIssuesParams {
  status?: IssueStatus;
  company?: string;
  model?: string;
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
}

export async function listIssues(params: ListIssuesParams = {}): Promise<Issue[]> {
  const { status, company, model, limit = 50, offset = 0, order = "desc" } = params;
  const supabase = getSupabaseClient();

  let query = supabase
    .from("issues")
    .select("*")
    .order("created_at", { ascending: order === "asc" })
    .range(offset, offset + Math.max(0, Math.min(limit, 100)) - 1);

  if (status) query = query.eq("status", status);
  if (company) query = query.eq("company", company);
  if (model) query = query.eq("model", model);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Issue[]) ?? [];
}

export async function createIssue(issue: NewIssue): Promise<Issue> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("issues")
    .insert(issue)
    .select("*")
    .single();

  if (error) throw error;
  return data as Issue;
}

export async function updateIssueStatus(id: number, status: IssueStatus): Promise<Issue> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("issues")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Issue;
}

// Solutions
export async function listSolutionsByQuestion(question: string): Promise<Solution[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("solutions")
    .select("*")
    .ilike("question", `%${question}%`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Solution[]) ?? [];
}

// Legacy function for backward compatibility
export async function listSolutionsByModelAndType(model: string, issueType: string): Promise<Solution[]> {
  const query = `${issueType} ${model}`;
  return listSolutionsByQuestion(query);
}

export async function upsertSolution(solution: NewSolution): Promise<Solution> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("solutions")
    .upsert(solution, { onConflict: "question" })
    .select("*")
    .single();

  if (error) throw error;
  return data as Solution;
}

// Metrics
export async function getLatestMetrics(): Promise<Metrics | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as Metrics) ?? null;
}

export async function insertMetrics(metrics: NewMetrics): Promise<Metrics> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("metrics")
    .insert(metrics)
    .select("*")
    .single();

  if (error) throw error;
  return data as Metrics;
}


