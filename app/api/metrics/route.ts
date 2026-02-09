import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import Papa from "papaparse";

// In-memory cache for parsed CSV data
let cachedData: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface FilterParams {
  from?: string;
  to?: string;
  department?: string;
  category?: string;
  priority?: string;
}

/**
 * Load and parse CSV file with caching
 */
function loadCSVData(): any[] {
  const now = Date.now();
  const filePath = path.join(process.cwd(), "data", "Monthly_Report.csv");
  
  // Check if cache is still valid
  if (cachedData && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedData;
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.warn("CSV file not found:", filePath);
    return [];
  }

  // Get file stats to check if it changed
  const stats = fs.statSync(filePath);
  if (cachedData && stats.mtimeMs <= cacheTimestamp) {
    return cachedData; // File hasn't changed
  }

  // Parse CSV
  const fileContent = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  cachedData = parsed.data;
  cacheTimestamp = now;
  
  return cachedData;
}

/**
 * Filter tickets based on query parameters
 */
function filterTickets(data: any[], filters: FilterParams): any[] {
  let filtered = [...data];

  if (filters.from) {
    const fromDate = new Date(filters.from);
    filtered = filtered.filter((t) => {
      const ticketDate = new Date(t["Log Time"] || t["Created Time"] || t["Updated Time"] || 0);
      return ticketDate >= fromDate;
    });
  }

  if (filters.to) {
    const toDate = new Date(filters.to);
    toDate.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter((t) => {
      const ticketDate = new Date(t["Log Time"] || t["Created Time"] || t["Updated Time"] || 0);
      return ticketDate <= toDate;
    });
  }

  if (filters.department) {
    filtered = filtered.filter(
      (t) => t["Department Display name"] === filters.department
    );
  }

  if (filters.category) {
    filtered = filtered.filter(
      (t) => t["Category"] === filters.category || t["Problem"] === filters.category
    );
  }

  if (filters.priority) {
    filtered = filtered.filter(
      (t) => t["Priority"] === filters.priority
    );
  }

  return filtered;
}

/**
 * Calculate KPIs from filtered tickets
 */
function calculateKPIs(tickets: any[]) {
  const totalTickets = tickets.length;
  
  // Open tickets (not resolved/closed)
  const openTickets = tickets.filter(
    (t) => {
      const status = (t["Status"] || "").toLowerCase();
      return !status.includes("closed") && !status.includes("resolved");
    }
  ).length;

  // MTTR: Mean Time To Resolve (in minutes)
  const resolutionTimes = tickets
    .map((t) => {
      const minutes = Number(t["Resolution SLA In Minutes"]) || 0;
      return minutes > 0 ? minutes : null;
    })
    .filter((t): t is number => t !== null);
  const mttr = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : 0;

  // MTBR: Mean Time Between Repairs (in minutes)
  const mtbr = (() => {
    const times = tickets
      .map((t) => new Date(t["Log Time"] || t["Created Time"] || 0).getTime())
      .filter((t) => Number.isFinite(t) && t > 0)
      .sort((a, b) => a - b);
    
    if (times.length < 2) return 0;
    
    const gaps: number[] = [];
    for (let i = 1; i < times.length; i++) {
      gaps.push((times[i] - times[i - 1]) / (1000 * 60)); // Convert to minutes
    }
    
    return gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  })();

  // CSAT: Approximate from FCR or use a default calculation
  const fcrMet = tickets.filter(
    (t) => (t["FCR Met"] || "").toString().toLowerCase() === "true"
  ).length;
  const csatAvg = totalTickets > 0 ? (fcrMet / totalTickets) * 100 : 0;

  // SLA Breaches
  const slaBreachCount = tickets.filter(
    (t) => (t["Resolution SLA - Violation"] || "").toString().toLowerCase() === "yes"
  ).length;
  const slaBreachPercent = totalTickets > 0 ? (slaBreachCount / totalTickets) * 100 : 0;

  // Top Problems
  const problemCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    const problem = t["Problem"] || t["Category"] || t["Symptom"] || "Unknown";
    problemCounts[problem] = (problemCounts[problem] || 0) + 1;
  });
  const topProblems = Object.entries(problemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top Solutions
  const solutionCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    const solution = t["Solution"] || "";
    if (solution && solution.trim().length > 10) {
      const key = solution.substring(0, 50); // First 50 chars
      solutionCounts[key] = (solutionCounts[key] || 0) + 1;
    }
  });
  const topSolutions = Object.entries(solutionCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalTickets,
    openTickets,
    avgResolutionMinutes: Number(mttr.toFixed(1)),
    mttr: Number(mttr.toFixed(1)),
    mtbr: Number(mtbr.toFixed(1)),
    csatAvg: Number(csatAvg.toFixed(2)),
    dsatPct: Number((100 - csatAvg).toFixed(2)),
    slaBreachCount,
    slaBreachPercent: Number(slaBreachPercent.toFixed(2)),
    topProblems,
    topSolutions,
  };
}

export async function GET(req: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const filters: FilterParams = {
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      department: searchParams.get("department") || undefined,
      category: searchParams.get("category") || undefined,
      priority: searchParams.get("priority") || undefined,
    };

    // Load and filter data
    const allData = loadCSVData();
    const filteredData = filterTickets(allData, filters);

    // Calculate KPIs
    const metrics = calculateKPIs(filteredData);

    return NextResponse.json(metrics, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/metrics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to compute metrics" },
      { status: 500 }
    );
  }
}
