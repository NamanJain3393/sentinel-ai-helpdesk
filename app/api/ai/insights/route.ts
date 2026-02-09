import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import Papa from "papaparse";
import { getChatCompletionText } from "@/lib/openrouter";

// In-memory cache (same as metrics route)
let cachedData: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000;

interface FilterParams {
  from?: string;
  to?: string;
  department?: string;
  category?: string;
  priority?: string;
}

function loadCSVData(): any[] {
  const now = Date.now();
  const filePath = path.join(process.cwd(), "data", "Monthly_Report.csv");
  
  if (cachedData && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedData;
  }

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const stats = fs.statSync(filePath);
  if (cachedData && stats.mtimeMs <= cacheTimestamp) {
    return cachedData;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  cachedData = parsed.data;
  cacheTimestamp = now;
  
  return cachedData;
}

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
    toDate.setHours(23, 59, 59, 999);
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
 * Calculate z-score for anomaly detection
 */
function calculateZScore(values: number[]): { mean: number; stdDev: number; zScores: number[] } {
  if (values.length === 0) return { mean: 0, stdDev: 0, zScores: [] };
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const zScores = values.map((val) => stdDev > 0 ? (val - mean) / stdDev : 0);
  
  return { mean, stdDev, zScores };
}

/**
 * Detect anomalies in ticket volume over time
 */
function detectAnomalies(tickets: any[]): string[] {
  const anomalies: string[] = [];
  
  // Group by date
  const dailyCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    const dateStr = new Date(t["Log Time"] || t["Created Time"] || 0).toISOString().split("T")[0];
    dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
  });
  
  const counts = Object.values(dailyCounts);
  if (counts.length < 3) return anomalies;
  
  const { mean, stdDev, zScores } = calculateZScore(counts);
  const dates = Object.keys(dailyCounts);
  
  // Find dates with z-score > 2 (statistical outlier)
  zScores.forEach((z, idx) => {
    if (Math.abs(z) > 2) {
      const date = dates[idx];
      const count = counts[idx];
      const direction = z > 0 ? "spike" : "drop";
      anomalies.push(
        `${date}: ${direction} in ticket volume (${count} tickets, ${z > 0 ? '+' : ''}${z.toFixed(1)}σ from mean)`
      );
    }
  });
  
  return anomalies.slice(0, 5); // Top 5 anomalies
}

/**
 * Generate insights using statistics and optional Gemini paraphrasing
 */
async function generateInsights(tickets: any[]): Promise<string> {
  if (tickets.length === 0) {
    return "No data available for analysis.";
  }

  // Calculate key stats
  const totalTickets = tickets.length;
  const resolutionTimes = tickets
    .map((t) => Number(t["Resolution SLA In Minutes"]) || 0)
    .filter((t) => t > 0);
  const avgResolution = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : 0;

  const slaBreaches = tickets.filter(
    (t) => (t["Resolution SLA - Violation"] || "").toString().toLowerCase() === "yes"
  ).length;
  const breachRate = (slaBreaches / totalTickets) * 100;

  // Top problems
  const problemCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    const problem = t["Problem"] || t["Category"] || "Unknown";
    problemCounts[problem] = (problemCounts[problem] || 0) + 1;
  });
  const topProblem = Object.entries(problemCounts)
    .sort((a, b) => b[1] - a[1])[0];

  // Top talkers
  const talkerCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    const talker = t["Caller"] || t["Department Display name"] || "Unknown";
    talkerCounts[talker] = (talkerCounts[talker] || 0) + 1;
  });
  const topTalker = Object.entries(talkerCounts)
    .sort((a, b) => b[1] - a[1])[0];

  // Detect anomalies
  const anomalies = detectAnomalies(tickets);

  // Generate recommendations
  const recommendations: string[] = [];
  if (avgResolution > 60) {
    recommendations.push("MTTR exceeds 60 minutes. Consider process improvements or resource allocation.");
  }
  if (breachRate > 10) {
    recommendations.push(`SLA breach rate is ${breachRate.toFixed(1)}%. Review priority assignment and escalation procedures.`);
  }
  if (topProblem && topProblem[1] > totalTickets * 0.2) {
    recommendations.push(`"${topProblem[0]}" accounts for ${((topProblem[1] / totalTickets) * 100).toFixed(1)}% of tickets. Consider proactive measures or documentation.`);
  }

  // Build summary text
  let summary = `📊 **Analytics Summary** (${new Date().toLocaleDateString()})\n\n`;
  summary += `**Key Metrics:**\n`;
  summary += `- Total Tickets: ${totalTickets.toLocaleString()}\n`;
  summary += `- Average Resolution Time: ${avgResolution.toFixed(1)} minutes\n`;
  summary += `- SLA Breach Rate: ${breachRate.toFixed(1)}%\n\n`;

  if (topProblem) {
    summary += `**Top Issue:** "${topProblem[0]}" (${topProblem[1]} occurrences)\n`;
  }
  if (topTalker) {
    summary += `**Top Requester:** ${topTalker[0]} (${topTalker[1]} tickets)\n`;
  }

  if (anomalies.length > 0) {
    summary += `\n**Anomalies Detected:**\n`;
    anomalies.forEach((a) => summary += `- ${a}\n`);
  }

  if (recommendations.length > 0) {
    summary += `\n**Top Recommendations:**\n`;
    recommendations.slice(0, 3).forEach((r, i) => summary += `${i + 1}. ${r}\n`);
  }

  // If OpenRouter API key is present, paraphrase for executive-friendly language
  if (process.env.OPENROUTER_API_KEY && summary.length > 100) {
    try {
      const aiSummary = await getChatCompletionText([
        {
          role: "system",
          content:
            "You are an executive analytics assistant. Convert technical metrics into concise, actionable business insights suitable for C-level presentations.",
        },
        {
          role: "user",
          content: `Analyze this ticket data summary and provide a concise executive overview with 3 key insights and 3 actionable recommendations:\n\n${summary}`,
        },
      ]);

      if (aiSummary) {
        return aiSummary;
      }
    } catch (error) {
      console.error("OpenRouter API error:", error);
      // Fall back to statistical summary
    }
  }

  return summary;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filters: FilterParams = {
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      department: searchParams.get("department") || undefined,
      category: searchParams.get("category") || undefined,
      priority: searchParams.get("priority") || undefined,
    };

    const allData = loadCSVData();
    const filteredData = filterTickets(allData, filters);

    const insights = await generateInsights(filteredData);

    return NextResponse.json(
      {
        insights,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in /api/ai/insights:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate insights" },
      { status: 500 }
    );
  }
}

