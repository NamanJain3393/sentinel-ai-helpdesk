/**
 * Analytics utilities for processing and filtering ticket data
 */

export interface Ticket {
  [key: string]: any;
}

export interface FilterOptions {
  department?: string;
  dateRange?: { start: Date | null; end: Date | null };
  priority?: string;
  status?: string;
  issueType?: string;
  category?: string;
}

/**
 * Filter tickets based on provided criteria
 */
export function filterTickets(tickets: Ticket[], filters: FilterOptions): Ticket[] {
  let filtered = [...tickets];

  if (filters.department) {
    filtered = filtered.filter(
      (t) => t["Department Display name"] === filters.department
    );
  }

  if (filters.status) {
    filtered = filtered.filter((t) => {
      const ticketStatus = t["Resolution SLA - Violation"] || t["Status"] || "";
      return ticketStatus.toLowerCase().includes(filters.status!.toLowerCase());
    });
  }

  if (filters.issueType) {
    filtered = filtered.filter((t) => {
      const issueType = t["Issue Type"] || t["Category"] || t["Problem"] || "";
      return String(issueType).toLowerCase() === filters.issueType!.toLowerCase();
    });
  }

  if (filters.category) {
    filtered = filtered.filter((t) => {
      const category = t["Category"] || t["Problem"] || "";
      return String(category).toLowerCase() === filters.category!.toLowerCase();
    });
  }

  if (filters.dateRange?.start || filters.dateRange?.end) {
    filtered = filtered.filter((t) => {
      const ticketDate = t["Created Time"] || t["Updated Time"] || "";
      if (!ticketDate) return false;
      const date = new Date(ticketDate);
      if (filters.dateRange?.start && date < filters.dateRange.start) return false;
      if (filters.dateRange?.end && date > filters.dateRange.end) return false;
      return true;
    });
  }

  return filtered;
}

/**
 * Calculate KPIs from filtered tickets
 */
export function calculateKPIs(tickets: Ticket[]) {
  const total = tickets.length;

  // Tag tickets with random ratings if missing (for demo/simulation as requested)
  tickets.forEach(t => {
    if (t.rating === undefined) {
      // Random rating 1-5: 1-2 (poor), 3 (avg), 4-5 (excellent)
      // Weighted towards success for realism
      const rand = Math.random();
      if (rand < 0.05) t.rating = 1;
      else if (rand < 0.15) t.rating = 2;
      else if (rand < 0.35) t.rating = 3;
      else if (rand < 0.70) t.rating = 4;
      else t.rating = 5;
    }
  });

  const slaViolations = tickets.filter(
    (t) => t["Resolution SLA - Violation"]?.toLowerCase() === "yes"
  ).length;
  const slaBreachPercent = total > 0 ? (slaViolations / total) * 100 : 0;

  const fcrMet = tickets.filter(
    (t) => t["FCR Met"]?.toLowerCase() === "yes"
  ).length;
  const fcrRate = total > 0 ? (fcrMet / total) * 100 : 0;

  // MTTR Components
  // Actual MTTR = Resolution SLA In Minutes (Total duration)
  // Adjusted MTTR = Resolution SLA In Minutes - Total Pending Duration
  const resolutionTimes = tickets
    .map((t) => Number(t["Resolution SLA In Minutes"]) || 0)
    .filter((v) => v > 0);

  const avgResolutionTime =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

  const pendingDurations = tickets
    .map((t) => Number(t["Total Pending Duration"]) || 0)
    .filter((v) => v > 0);

  const avgPendingDuration =
    pendingDurations.length > 0
      ? pendingDurations.reduce((a, b) => a + b, 0) / pendingDurations.length
      : 0;

  const adjustedMTTR = avgResolutionTime - avgPendingDuration;

  // CSAT Calculation: (Sum(CSAT * count) / total count) -> User formula
  // In our case, CSAT is the rating 1-5
  const totalRating = tickets.reduce((sum, t) => sum + (t.rating || 0), 0);
  const avgRating = total > 0 ? totalRating / total : 0;

  // CSAT Score (%) = Percentage of 4-5 ratings
  const positiveRatings = tickets.filter(t => (t.rating || 0) >= 4).length;
  const csat = total > 0 ? (positiveRatings / total) * 100 : 0;

  // DSAT Score (%) = Percentage of 1-2 ratings
  const negativeRatings = tickets.filter(t => (t.rating || 0) <= 2).length;
  const dsat = total > 0 ? (negativeRatings / total) * 100 : 0;

  // Resolved tickets
  const resolved = tickets.filter(
    (t) => {
      const status = (t["Status"] || "").toLowerCase();
      return status.includes("resolved") || status.includes("closed");
    }
  ).length;

  // Open tickets
  const open = total - resolved;

  // Reopened tickets
  const reopened = tickets.filter(
    (t) => (t["Reopen Incident"] || "").toString().toLowerCase() === "true"
  ).length;

  // Percentage of resolved (with high precision for small differences)
  const resolvedPercent = total > 0 ? (resolved / total) * 100 : 0;
  // If resolved is very close to total but not equal, show more precision or avoid "100.0%"
  const displayResolvedPercent = resolved === total ? "100" : resolvedPercent.toFixed(2);

  // Escalation rate
  const escalated = tickets.filter(
    (t) => {
      const priority = (t["Priority"] || "").toString().toUpperCase();
      return priority === "P1" || priority === "P2" || priority.includes("HIGH");
    }
  ).length;

  return {
    total,
    resolved,
    open,
    resolvedPercent: displayResolvedPercent,
    slaBreachPercent: Number(slaBreachPercent.toFixed(2)),
    fcrRate: Number(fcrRate.toFixed(2)),
    avgResolutionTime: Number(avgResolutionTime.toFixed(1)),
    avgPendingDuration: Number(avgPendingDuration.toFixed(1)),
    adjustedMTTR: Number(adjustedMTTR.toFixed(1)),
    avgRating: Number(avgRating.toFixed(2)),
    csat: Number(csat.toFixed(1)),
    dsat: Number(dsat.toFixed(1)),
    reopened,
    reopenedPercent: total > 0 ? Number(((reopened / total) * 100).toFixed(2)) : 0,
    escalationRate: Number((total > 0 ? (escalated / total) * 100 : 0).toFixed(2)),
  };
}

/**
 * Get unique departments from tickets
 */
export function getDepartments(tickets: Ticket[]): string[] {
  const depts = new Set<string>();
  tickets.forEach((t) => {
    const dept = t["Department Display name"];
    if (dept) depts.add(dept);
  });
  return Array.from(depts).sort();
}

/**
 * Mean Time Between Failures (MTBF) - Estimated
 */
export function getMTBF(tickets: Ticket[]): number {
  const failureTickets = tickets.filter(t => {
    const type = (t["Issue Type"] || t["Category"] || "").toLowerCase();
    return type.includes("failure") || type.includes("error") || type.includes("incident") || type.includes("broken");
  });

  if (failureTickets.length < 2) return 0;

  const times = failureTickets
    .map((t) => new Date(t["Created Time"] || t["Updated Time"] || 0).getTime())
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  if (times.length < 2) return 0;

  const totalHours = (times[times.length - 1] - times[0]) / (1000 * 60 * 60);
  return Number((totalHours / failureTickets.length).toFixed(1));
}

/**
 * Get DSAT analysis: type, location, and person getting DSAT
 */
export function getDSATAnalysis(tickets: Ticket[]) {
  const dsatTickets = tickets.filter(t => (t.rating || 0) <= 2);

  const byType: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  const byEngineer: Record<string, number> = {};

  dsatTickets.forEach(t => {
    const type = t["Category"] || t["Classification"] || "Unknown";
    const loc = t["Department Display name"] || "Unknown";
    const eng = t["Assigned To"] || t["Logged By User Name"] || "Unassigned";

    byType[type] = (byType[type] || 0) + 1;
    byLocation[loc] = (byLocation[loc] || 0) + 1;
    byEngineer[eng] = (byEngineer[eng] || 0) + 1;
  });

  return {
    byType: Object.entries(byType).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    byLocation: Object.entries(byLocation).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    byEngineer: Object.entries(byEngineer).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
  };
}

/**
 * Top talkers by a likely requester field
 */
export function getTopTalkers(tickets: Ticket[], limit: number = 10) {
  const counts: Record<string, number> = {};
  tickets.forEach((t) => {
    const user = t["Requester"] || t["Caller"] || t["Logged By User Name"] || "Unknown";
    counts[user] = (counts[user] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getTopProblems(tickets: Ticket[], limit: number = 10) {
  const counts: Record<string, number> = {};
  tickets.forEach((t) => {
    const key = String(t["Category"] || t["Symptom"] || "Misc");
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getTopSolutions(tickets: Ticket[], limit: number = 10) {
  const counts: Record<string, number> = {};
  tickets.forEach((t) => {
    const key = (t["Solution"] ? String(t["Solution"]).slice(0, 50) + "…" : "Unknown");
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Prepare data for SLA violations by department
 */
export function getSLAViolationsByDepartment(tickets: Ticket[]) {
  const deptViolations: Record<string, { total: number; violations: number }> = {};

  tickets.forEach((t) => {
    const dept = t["Department Display name"] || "Unknown";
    if (!deptViolations[dept]) {
      deptViolations[dept] = { total: 0, violations: 0 };
    }
    deptViolations[dept].total += 1;
    if (t["Resolution SLA - Violation"]?.toLowerCase() === "yes") {
      deptViolations[dept].violations += 1;
    }
  });

  return Object.entries(deptViolations)
    .map(([name, data]) => ({
      name,
      violations: data.violations,
      total: data.total,
      rate: data.total > 0 ? (data.violations / data.total) * 100 : 0,
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);
}

/**
 * Get CSAT vs DSAT trend over time (monthly)
 */
export function getCSATDSATTrend(tickets: Ticket[]) {
  const monthly: Record<string, { csat: number; dsat: number; count: number }> = {};

  tickets.forEach((t) => {
    const dateStr = t["Log Time"] || t["Created Time"] || t["Updated Time"] || "";
    if (!dateStr) return;
    const date = new Date(dateStr);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthly[monthKey]) {
      monthly[monthKey] = { csat: 0, dsat: 0, count: 0 };
    }

    monthly[monthKey].count += 1;
    const fcrMet = (t["FCR Met"] || "").toString().toLowerCase() === "true";
    if (fcrMet) {
      monthly[monthKey].csat += 1;
    } else {
      monthly[monthKey].dsat += 1;
    }
  });

  return Object.entries(monthly)
    .map(([month, data]) => ({
      month,
      csat: data.count > 0 ? (data.csat / data.count) * 100 : 0,
      dsat: data.count > 0 ? (data.dsat / data.count) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function getDepartmentPerformance(tickets: Ticket[]) {
  const depts = getDepartments(tickets);
  const data = depts.map(dept => {
    const deptTickets = tickets.filter(t => t["Department Display name"] === dept);
    if (deptTickets.length === 0) return null;

    const totalRes = deptTickets.reduce((sum, t) => sum + (Number(t["Resolution SLA In Minutes"]) || 0), 0) / deptTickets.length;
    const slaMet = deptTickets.filter(t => (t["Resolution SLA - Violation"] || "").toLowerCase() !== "yes").length;
    const fcrMet = deptTickets.filter(t => (t["FCR Met"] || "").toString().toLowerCase() === "true" || (t["FCR Met"] || "").toString().toLowerCase() === "yes").length;

    return {
      name: dept,
      avgResolutionTime: totalRes,
      totalTickets: deptTickets.length,
      slaRate: Number(((slaMet / deptTickets.length) * 100).toFixed(1)),
      fcrRate: Number(((fcrMet / deptTickets.length) * 100).toFixed(1))
    };
  }).filter((d): d is { name: string; avgResolutionTime: number; totalTickets: number; slaRate: number; fcrRate: number } => d !== null);

  return data.sort((a, b) => b.totalTickets - a.totalTickets).slice(0, 10);
}

/**
 * Get ticket type distribution (Incidents vs Requests vs Failures)
 */
export function getTicketTypeDistribution(tickets: Ticket[]) {
  const types: Record<string, number> = {
    Incident: 0,
    Request: 0,
    Failure: 0,
    Other: 0,
  };

  tickets.forEach((t) => {
    const category = (t["Category"] || t["Classification"] || "").toString().toLowerCase();
    if (category.includes("incident") || category.includes("issue")) {
      types.Incident += 1;
    } else if (category.includes("request") || category.includes("service")) {
      types.Request += 1;
    } else if (category.includes("failure") || category.includes("error") || category.includes("down")) {
      types.Failure += 1;
    } else {
      types.Other += 1;
    }
  });

  return Object.entries(types)
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0);
}

/**
 * Get priority breakdown
 */
export function getPriorityBreakdown(tickets: Ticket[]) {
  const priorities: Record<string, number> = {
    High: 0,
    Medium: 0,
    Low: 0,
    Other: 0,
  };

  tickets.forEach((t) => {
    const priority = (t["Priority"] || "").toString().toUpperCase();
    if (priority === "P1" || priority.includes("HIGH") || priority === "1") {
      priorities.High += 1;
    } else if (priority === "P2" || priority.includes("MEDIUM") || priority === "2") {
      priorities.Medium += 1;
    } else if (priority === "P3" || priority.includes("LOW") || priority === "3") {
      priorities.Low += 1;
    } else {
      priorities.Other += 1;
    }
  });

  return Object.entries(priorities)
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0);
}

/**
 * Get problem category heatmap data (issue type vs resolution time)
 */
export function getProblemCategoryHeatmap(tickets: Ticket[]) {
  const heatmap: Record<string, { total: number; totalTime: number; count: number }> = {};

  tickets.forEach((t) => {
    const category = t["Category"] || t["Problem"] || "Other";
    const resolutionTime = Number(t["Resolution SLA In Minutes"]) || 0;

    if (!heatmap[category]) {
      heatmap[category] = { total: 0, totalTime: 0, count: 0 };
    }

    heatmap[category].total += 1;
    if (resolutionTime > 0) {
      heatmap[category].totalTime += resolutionTime;
      heatmap[category].count += 1;
    }
  });

  return Object.entries(heatmap)
    .map(([category, data]) => ({
      category,
      avgResolutionTime: data.count > 0 ? data.totalTime / data.count : 0,
      ticketCount: data.total,
    }))
    .sort((a, b) => b.ticketCount - a.ticketCount)
    .slice(0, 15);
}

/**
 * Generate auto insights based on data trends
 */
export function generateInsights(tickets: Ticket[], previousPeriodTickets?: Ticket[]) {
  const insights: string[] = [];
  const currentKPIs = calculateKPIs(tickets);
  const topProblems = getTopProblems(tickets);
  const topSolutions = getTopSolutions(tickets);
  const deptPerformance = getDepartmentPerformance(tickets);

  // Compare with previous period if available
  if (previousPeriodTickets && previousPeriodTickets.length > 0) {
    const prevKPIs = calculateKPIs(previousPeriodTickets);
    const ticketChange = ((currentKPIs.total - prevKPIs.total) / prevKPIs.total) * 100;

    if (Math.abs(ticketChange) > 5) {
      insights.push(
        `Ticket volume ${ticketChange > 0 ? "increased" : "decreased"} by ${Math.abs(ticketChange).toFixed(1)}% compared to the previous period.`
      );
    }

    const csatChange = currentKPIs.csat - prevKPIs.csat;
    if (Math.abs(csatChange) > 2) {
      insights.push(
        `Customer satisfaction ${csatChange > 0 ? "improved" : "declined"} by ${Math.abs(csatChange).toFixed(1)}% from the previous period.`
      );
    }

    const mttrChange = currentKPIs.avgResolutionTime - prevKPIs.avgResolutionTime;
    if (Math.abs(mttrChange) > 10) {
      insights.push(
        `Average resolution time ${mttrChange > 0 ? "increased" : "decreased"} by ${Math.abs(mttrChange).toFixed(1)} minutes.`
      );
    }
  }

  // Top problem insights
  if (topProblems.length > 0) {
    const topProblem = topProblems[0];
    const problemPercent = (topProblem.count / currentKPIs.total) * 100;
    if (problemPercent > 15) {
      insights.push(
        `"${topProblem.name}" accounts for ${problemPercent.toFixed(1)}% of all tickets. Consider proactive measures or documentation.`
      );
    }
  }

  // Efficiency Bottleneck insights
  const efficiencyData = getCategoryEfficiency(tickets);
  const bottlenecks = efficiencyData.filter(d => d.volume > currentKPIs.total * 0.1 && d.mttr > currentKPIs.avgResolutionTime * 1.5);
  if (bottlenecks.length > 0) {
    insights.push(
      `CRITICAL: "${bottlenecks[0].name}" is a major bottleneck (High Volume + 50% slower MTTR). Consider specialized team training.`
    );
  }

  // SLA Multi-tier insights
  const slaPriority = getSLAPriorityMatrix(tickets);
  const p1Breach = slaPriority.find(p => p.priority === "P1" && p.breach > 10);
  if (p1Breach) {
    insights.push(
      `ALARM: P1 tickets have a ${p1Breach.breach}% breach rate. Critical incident response protocol review recommended.`
    );
  }

  // Balanced Department insights
  if (deptPerformance.length > 0) {
    const topDept = [...deptPerformance].sort((a, b) => b.slaRate - a.slaRate)[0];
    if (topDept && topDept.slaRate > 95) {
      insights.push(
        `${topDept.name} is leading in service quality with a ${topDept.slaRate}% SLA compliance rate. Model their workflow for other teams.`
      );
    }
  }

  // Department performance insights (original, moved down)
  if (deptPerformance.length > 0) {
    const avgMTTR = currentKPIs.avgResolutionTime;
    const slowDept = deptPerformance.find((d) => d.avgResolutionTime > avgMTTR * 1.4);
    if (slowDept) {
      insights.push(
        `${slowDept.name} has an average resolution time ${((slowDept.avgResolutionTime / avgMTTR - 1) * 100).toFixed(0)}% slower than the overall average.`
      );
    }
  }

  // Escalation insights
  if (currentKPIs.escalationRate > 15) {
    insights.push(
      `High Escalation Rate (${currentKPIs.escalationRate.toFixed(1)}%) detected. Second-line support may be over-extended.`
    );
  }

  // Reopened ticket insights
  if (currentKPIs.reopenedPercent > 5) {
    insights.push(
      `Reopened ticket rate is ${currentKPIs.reopenedPercent.toFixed(1)}%. Focus on root cause analysis and solution quality.`
    );
  }

  return insights.slice(0, 5); // Return top 5 most critical insights
}

/**
 * Get data for Radar chart: comparing top departments across 5 metrics
 */
export function getRadarComparisonData(tickets: Ticket[]) {
  const depts = getDepartments(tickets);
  const deptStats: Record<string, any> = {};

  depts.forEach(dept => {
    const deptTickets = tickets.filter(t => t["Department Display name"] === dept);
    if (deptTickets.length < 50) return; // Only show significant depts

    const kpis = calculateKPIs(deptTickets);
    deptStats[dept] = {
      name: dept,
      "CSAT %": kpis.csat,
      "SLA %": 100 - kpis.slaBreachPercent,
      "FCR %": kpis.fcrRate,
      "Resolution Speed": Math.max(0, 100 - (kpis.avgResolutionTime / 10)), // Normalized
      "Escalation Resistance": 100 - kpis.escalationRate,
    };
  });

  return Object.values(deptStats).sort((a: any, b: any) => b["CSAT %"] - a["CSAT %"]).slice(0, 5);
}

/**
 * Get MTTR breakdown: Work Time vs Pending Time per Dept
 */
export function getMTTRComponentBreakdown(tickets: Ticket[]) {
  const depts = getDepartments(tickets);
  const data = depts.map(dept => {
    const deptTickets = tickets.filter(t => t["Department Display name"] === dept);
    if (deptTickets.length < 20) return null;

    const totalRes = deptTickets.reduce((sum, t) => sum + (Number(t["Resolution SLA In Minutes"]) || 0), 0) / deptTickets.length;
    const totalPending = deptTickets.reduce((sum, t) => sum + (Number(t["Total Pending Duration"]) || 0), 0) / deptTickets.length;

    return {
      name: dept,
      "Work Time": Math.max(0, totalRes - totalPending),
      "Pending Time": totalPending,
    };
  }).filter(Boolean);

  return data.sort((a: any, b: any) => (b["Work Time"] + b["Pending Time"]) - (a["Work Time"] + a["Pending Time"])).slice(0, 10);
}

/**
 * Satisfaction Correlation: Resolution Time vs Rating
 */
export function getCorrelationData(tickets: Ticket[]) {
  return tickets
    .filter(t => t.rating && t["Resolution SLA In Minutes"])
    .map(t => ({
      x: Number(t["Resolution SLA In Minutes"]),
      y: t.rating,
      id: t["Incident ID"]
    }))
    .slice(0, 500); // Sample for performance
}

/**
 * SLA Breach Risk Map: Volume vs Breach Rate vs MTTR
 */
export function getSLARiskBubbleData(tickets: Ticket[]) {
  const depts = getDepartments(tickets);
  return depts.map(dept => {
    const deptTickets = tickets.filter(t => t["Department Display name"] === dept);
    if (deptTickets.length < 10) return null;

    const kpis = calculateKPIs(deptTickets);
    return {
      name: dept,
      volume: deptTickets.length,
      breachRate: kpis.slaBreachPercent,
      mttr: kpis.avgResolutionTime,
    };
  }).filter(Boolean).sort((a: any, b: any) => b.breachRate - a.breachRate);
}

/**
 * Pareto Analysis (80/20 Rule): Top categories by volume + cumulative %
 */
export function getParetoData(tickets: Ticket[]) {
  const counts: Record<string, number> = {};
  tickets.forEach(t => {
    const key = t["Category"] || "Other";
    counts[key] = (counts[key] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const total = tickets.length;
  let cumulative = 0;

  return sorted.map(item => {
    cumulative += item.count;
    return {
      ...item,
      cumulative: Number(((cumulative / total) * 100).toFixed(1)),
    };
  }).slice(0, 12);
}

/**
 * Get Average Rating by Department
 */
export function getRatingByDepartment(tickets: Ticket[]) {
  const depts = getDepartments(tickets);
  return depts.map(dept => {
    const deptTickets = tickets.filter(t => t["Department Display name"] === dept);
    if (deptTickets.length < 10) return null;
    const avgRating = deptTickets.reduce((sum, t) => sum + (t.rating || 0), 0) / deptTickets.length;
    return { name: dept, rating: Number(avgRating.toFixed(2)) };
  }).filter(Boolean).sort((a: any, b: any) => b.rating - a.rating).slice(0, 10);
}

/**
 * Get SLA Compliance Rate (%) by Department
 */
export function getSLARateByDepartment(tickets: Ticket[]) {
  const depts = getDepartments(tickets);
  return depts.map(dept => {
    const deptTickets = tickets.filter(t => t["Department Display name"] === dept);
    if (deptTickets.length < 10) return null;
    const slaMet = deptTickets.filter(t => (t["Resolution SLA - Violation"] || "").toLowerCase() !== "yes").length;
    return { name: dept, rate: Number(((slaMet / deptTickets.length) * 100).toFixed(1)) };
  }).filter(Boolean).sort((a: any, b: any) => b.rate - a.rate).slice(0, 10);
}

/**
 * Get First Call Resolution (FCR) Rate by Category
 */
export function getFCRRateByCategory(tickets: Ticket[]) {
  const categories: Record<string, { total: number, fcr: number }> = {};
  tickets.forEach(t => {
    const cat = t["Category"] || "Other";
    if (!categories[cat]) categories[cat] = { total: 0, fcr: 0 };
    categories[cat].total += 1;
    if ((t["FCR Met"] || "").toString().toLowerCase() === "yes") {
      categories[cat].fcr += 1;
    }
  });

  return Object.entries(categories)
    .map(([name, data]) => ({
      name,
      rate: Number(((data.fcr / data.total) * 100).toFixed(1))
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);
}

/**
 * Get MTTR Distribution (Histogram data)
 */
export function getMTTRDistribution(tickets: Ticket[]) {
  const buckets = [
    { label: "0-30m", min: 0, max: 30, count: 0 },
    { label: "30-60m", min: 30, max: 60, count: 0 },
    { label: "1-2h", min: 60, max: 120, count: 0 },
    { label: "2-4h", min: 120, max: 240, count: 0 },
    { label: "4-8h", min: 240, max: 480, count: 0 },
    { label: ">8h", min: 480, max: Infinity, count: 0 },
  ];

  tickets.forEach(t => {
    const time = Number(t["Resolution SLA In Minutes"]) || 0;
    const bucket = buckets.find(b => time >= b.min && time < b.max);
    if (bucket) bucket.count += 1;
  });

  return buckets;
}

/**
 * Get Volume by Priority Over Time (Stacked data)
 */
export function getVolumeByPriorityTrend(tickets: Ticket[]) {
  const trend: Record<string, any> = {};

  tickets.forEach(t => {
    const date = new Date(t["Log Time"] || t["Created Time"] || 0).toISOString().split("T")[0];
    if (!trend[date]) {
      trend[date] = { date, P1: 0, P2: 0, P3: 0, P4: 0, Total: 0 };
    }
    const priority = t["Priority"] || "Other";
    const key = priority.startsWith("P") ? priority.substring(0, 2) : "P4";
    if (trend[date][key] !== undefined) {
      trend[date][key] += 1;
      trend[date].Total += 1;
    }
  });

  return Object.values(trend).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
}

/**
 * Get Agent Performance Comparison
 */
export function getAgentPerformance(tickets: Ticket[]) {
  const agents: Record<string, { name: string, count: number, totalTime: number, slaMet: number }> = {};

  tickets.forEach(t => {
    const name = t["Assigned To"] || "Unassigned";
    if (!agents[name]) agents[name] = { name, count: 0, totalTime: 0, slaMet: 0 };

    agents[name].count += 1;
    agents[name].totalTime += Number(t["Resolution SLA In Minutes"]) || 0;
    if ((t["Resolution SLA - Violation"] || "").toLowerCase() !== "yes") {
      agents[name].slaMet += 1;
    }
  });

  return Object.values(agents)
    .map(a => ({
      name: a.name,
      count: a.count,
      mttr: Number((a.totalTime / a.count).toFixed(1)),
      slaRate: Number(((a.slaMet / a.count) * 100).toFixed(1))
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Get Satisfaction Heatmap (Day of Week vs Hour of Day)
 */
export function getTimeBasisHeatmap(tickets: Ticket[]) {
  const heatmap: Record<string, Record<number, { count: number, totalRating: number }>> = {};
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  days.forEach(day => {
    heatmap[day] = {};
    for (let h = 0; h < 24; h++) heatmap[day][h] = { count: 0, totalRating: 0 };
  });

  tickets.forEach(t => {
    const date = new Date(t["Log Time"] || t["Created Time"] || 0);
    const day = days[date.getDay()];
    const hour = date.getHours();

    if (day && heatmap[day][hour]) {
      heatmap[day][hour].count += 1;
      heatmap[day][hour].totalRating += t.rating || 0;
    }
  });

  const flatData: any[] = [];
  days.forEach(day => {
    for (let h = 0; h < 24; h++) {
      flatData.push({
        day,
        hour: h,
        count: heatmap[day][h].count,
        avgRating: heatmap[day][h].count > 0 ? Number((heatmap[day][h].totalRating / heatmap[day][h].count).toFixed(1)) : 0
      });
    }
  });

  return flatData;
}

/**
 * Get Escalation Rate and Volume by Department
 */
export function getEscalationAnalysis(tickets: Ticket[]) {
  const depts = getDepartments(tickets);
  return depts.map(dept => {
    const deptTickets = tickets.filter(t => t["Department Display name"] === dept);
    if (deptTickets.length < 10) return null;

    const escalated = deptTickets.filter(t => (t["Escalated"] || "").toString().toLowerCase() === "yes").length;
    return {
      name: dept,
      count: escalated,
      rate: Number(((escalated / deptTickets.length) * 100).toFixed(1))
    };
  }).filter(Boolean).sort((a: any, b: any) => b.count - a.count).slice(0, 10);
}

/**
 * Get Ticket Status Distribution
 */
export function getStatusDistribution(tickets: Ticket[]) {
  const statusCounts: Record<string, number> = {};
  tickets.forEach(t => {
    const status = t["Status"] || "Unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  return Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Get Volume by Workgroup
 */
export function getWorkgroupVolume(tickets: Ticket[]) {
  const wgCounts: Record<string, number> = {};
  tickets.forEach(t => {
    const wg = t["Workgroup"] || "Other";
    if (wg.trim().length > 1) {
      wgCounts[wg] = (wgCounts[wg] || 0) + 1;
    }
  });
  return Object.entries(wgCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Get Ticket Aging (based on Ticket Age column)
 */
export function getTicketAgingDistribution(tickets: Ticket[]) {
  const buckets: Record<string, number> = {
    "0 to 4 Hours": 0,
    "4 to 16 Hours": 0,
    "16 to 24 Hours": 0,
    "1 to 2 Days": 0,
    "2 to 5 Days": 0,
    "5 to 10 Days": 0,
    "> 10 Days": 0
  };

  tickets.forEach(t => {
    const age = t["Ticket Age"] || "";
    if (buckets[age] !== undefined) {
      buckets[age] += 1;
    } else if (age.includes("> 10")) {
      buckets["> 10 Days"] += 1;
    }
  });

  return Object.entries(buckets).map(([name, count]) => ({ name, count }));
}

/**
 * Get SLA Performance by Priority Matrix
 */
export function getSLAPriorityMatrix(tickets: Ticket[]) {
  const priorities = ["P1", "P2", "P3", "P4"];
  return priorities.map(prio => {
    const prioTickets = tickets.filter(t => String(t["Priority"]).toUpperCase() === prio || String(t["Priority"]).toUpperCase() === `PRIORITY ${prio}`);
    if (prioTickets.length === 0) return { priority: prio, compliance: 0, breach: 0 };

    const complianceCount = prioTickets.filter(t => (t["Resolution SLA - Violation"] || "").toString().toLowerCase() !== "yes").length;
    const complianceRate = (complianceCount / prioTickets.length) * 100;

    return {
      priority: prio,
      compliance: Number(complianceRate.toFixed(1)),
      breach: Number((100 - complianceRate).toFixed(1))
    };
  });
}

/**
 * Get Category Efficiency (Volume vs MTTR)
 */
export function getCategoryEfficiency(tickets: Ticket[]) {
  const categories: Record<string, { total: number; totalTime: number; count: number }> = {};

  tickets.forEach(t => {
    const cat = t["Category"] || t["Problem"] || "Other";
    const time = Number(t["Resolution SLA In Minutes"]) || 0;

    if (!categories[cat]) categories[cat] = { total: 0, totalTime: 0, count: 0 };
    categories[cat].total += 1;
    if (time > 0) {
      categories[cat].totalTime += time;
      categories[cat].count += 1;
    }
  });

  return Object.entries(categories)
    .map(([name, data]) => ({
      name,
      volume: data.total,
      mttr: data.count > 0 ? Number((data.totalTime / data.count).toFixed(1)) : 0
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 15);
}

/**
 * Export tickets to CSV format
 */
export function exportToCSV(tickets: Ticket[]): string {
  if (tickets.length === 0) return "";

  const headers = Object.keys(tickets[0]);
  const csvRows = [headers.join(",")];

  tickets.forEach((ticket) => {
    const values = headers.map((header) => {
      const value = ticket[header] || "";
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  });

  return csvRows.join("\n");
}
