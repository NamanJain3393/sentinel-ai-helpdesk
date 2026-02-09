"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  Treemap,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Filter, RefreshCw, FileText, Sparkles, TrendingUp, Moon, Sun, Menu, X, AlertTriangle, Star, CheckCircle, Zap } from "lucide-react";
import {
  filterTickets,
  calculateKPIs,
  getDepartments,
  getMTBF,
  getDSATAnalysis,
  getTopTalkers,
  getTopProblems,
  getTopSolutions,
  getSLAViolationsByDepartment,
  getCSATDSATTrend,
  getDepartmentPerformance,
  getTicketTypeDistribution,
  getPriorityBreakdown,
  getProblemCategoryHeatmap,
  generateInsights,
  getRatingByDepartment,
  getSLARateByDepartment,
  getSLAPriorityMatrix,
  getCategoryEfficiency,
  getWorkgroupVolume,
  getTicketAgingDistribution,
  getMTTRDistribution,
  getVolumeByPriorityTrend,
  getAgentPerformance,
  getTimeBasisHeatmap,
  getEscalationAnalysis,
  type FilterOptions,
  type Ticket,
} from "@/lib/analytics";
import Top10IssuesChart from "@/components/analytics/Top10IssuesChart";
import TimeSeriesChart from "@/components/analytics/TimeSeriesChart";
import TicketTable from "@/components/analytics/TicketTable";
import KPIStats from "@/components/analytics/KPIStats";
import CSATDSATTrendChart from "@/components/analytics/CSATDSATTrendChart";
import AreaChart from "@/components/analytics/AreaChart";
import DepartmentPerformanceChart from "@/components/analytics/DepartmentPerformanceChart";
import TicketTypeDistributionChart from "@/components/analytics/TicketTypeDistributionChart";
import PriorityBreakdownChart from "@/components/analytics/PriorityBreakdownChart";
import ProblemCategoryHeatmap from "@/components/analytics/ProblemCategoryHeatmap";
import InsightsPanel from "@/components/analytics/InsightsPanel";
import AgentPerformanceChart from "@/components/analytics/AgentPerformanceChart";
import PriorityTrendChart from "@/components/analytics/PriorityTrendChart";
import MTTRDistributionChart from "@/components/analytics/MTTRDistributionChart";
import OperationalHeatmap from "@/components/analytics/OperationalHeatmap";
import WorkgroupVolumeChart from "@/components/analytics/WorkgroupVolumeChart";
import TicketAgingChart from "@/components/analytics/TicketAgingChart";
import SLAPriorityMatrix from "@/components/analytics/SLAPriorityMatrix";
import CategoryEfficiencyScatter from "@/components/analytics/CategoryEfficiencyScatter";

const PIE_COLORS = [
  "#4f46e5",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#3b82f6",
  "#14b8a6",
  "#f97316",
  "#ec4899",
  "#06b6d4",
];

function AnalyticsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);

  // Initialize filters from URL
  const [filters, setFilters] = useState<FilterOptions>(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    return {
      department: searchParams.get("department") || undefined,
      category: searchParams.get("category") || undefined,
      priority: searchParams.get("priority") || undefined,
      dateRange: from || to ? {
        start: from ? new Date(from) : null,
        end: to ? new Date(to) : null,
      } : undefined,
    };
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.department) params.set("department", filters.department);
    if (filters.category) params.set("category", filters.category);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.dateRange?.start) {
      params.set("from", filters.dateRange.start.toISOString().split("T")[0]);
    }
    if (filters.dateRange?.end) {
      params.set("to", filters.dateRange.end.toISOString().split("T")[0]);
    }
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  }, [filters, router]);

  // Fetch data and metrics
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch raw data
      const dataRes = await fetch("/api/data");
      const d = await dataRes.json();
      setData(d);

      // Extract unique values for filters
      const depts = new Set<string>();
      const cats = new Set<string>();
      const prios = new Set<string>();

      d.forEach((t: Ticket) => {
        if (t["Department Display name"]) depts.add(String(t["Department Display name"]));
        if (t["Category"]) cats.add(String(t["Category"]));
        if (t["Priority"]) prios.add(String(t["Priority"]));
      });

      setDepartments(Array.from(depts).sort());
      setCategories(Array.from(cats).sort());
      setPriorities(Array.from(prios).sort());

      // Fetch metrics with current filters
      const metricsParams = new URLSearchParams();
      if (filters.department) metricsParams.set("department", filters.department);
      if (filters.category) metricsParams.set("category", filters.category);
      if (filters.priority) metricsParams.set("priority", filters.priority);
      if (filters.dateRange?.start) {
        metricsParams.set("from", filters.dateRange.start.toISOString().split("T")[0]);
      }
      if (filters.dateRange?.end) {
        metricsParams.set("to", filters.dateRange.end.toISOString().split("T")[0]);
      }

      const metricsRes = await fetch(`/api/metrics?${metricsParams.toString()}`);
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced filter updates
  const [debouncedFilters, setDebouncedFilters] = useState<FilterOptions>(filters);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  // Apply filters
  const filteredData = useMemo(() => {
    return filterTickets(data, debouncedFilters);
  }, [data, debouncedFilters]);

  // Calculate KPIs
  const kpis = useMemo(() => calculateKPIs(filteredData), [filteredData]);
  const mtbf = useMemo(() => getMTBF(filteredData), [filteredData]);

  // Time series data for ticket volume
  const timeSeriesData = useMemo(() => {
    const timeSeries: Record<string, { count: number; totalMTTR: number }> = {};
    filteredData.forEach((t) => {
      const dateStr = new Date(t["Log Time"] || t["Created Time"] || t["Updated Time"] || 0)
        .toISOString()
        .split("T")[0];
      if (!timeSeries[dateStr]) {
        timeSeries[dateStr] = { count: 0, totalMTTR: 0 };
      }
      timeSeries[dateStr].count += 1;
      timeSeries[dateStr].totalMTTR += Number(t["Resolution SLA In Minutes"]) || 0;
    });

    return Object.entries(timeSeries)
      .map(([date, values]) => ({
        date,
        count: values.count,
        mttr: values.totalMTTR / values.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const [topLimit, setTopLimit] = useState<number>(10);

  // Top Problems (with drill-down support)
  const topProblemsData = useMemo(() => getTopProblems(filteredData, topLimit), [filteredData, topLimit]);

  const handleProblemClick = useCallback((problemName: string) => {
    setFilters((prev) => ({
      ...prev,
      category: problemName,
    }));
  }, []);

  const handleDeptClick = useCallback((deptName: string) => {
    setFilters((prev) => ({
      ...prev,
      department: deptName,
    }));
  }, []);

  const handlePriorityClick = useCallback((priority: string) => {
    setFilters((prev) => ({
      ...prev,
      priority: priority,
    }));
  }, []);

  const handleTypeClick = useCallback((type: string) => {
    // Note: Our filter and data processing functions use 'issueType'
    setFilters((prev) => ({
      ...prev,
      issueType: type,
    }));
  }, []);

  // Top Solutions
  const topSolutionsData = useMemo(() => getTopSolutions(filteredData, topLimit), [filteredData, topLimit]);

  // DSAT Analysis
  const dsatAnalysis = useMemo(() => getDSATAnalysis(filteredData), [filteredData]);

  // CSAT/DSAT Trend
  const csatDsatTrend = useMemo(() => getCSATDSATTrend(filteredData), [filteredData]);

  // Department Performance
  const deptPerformance = useMemo(() => getDepartmentPerformance(filteredData), [filteredData]);

  // Ticket Type Distribution
  const ticketTypeDist = useMemo(() => getTicketTypeDistribution(filteredData), [filteredData]);

  // Priority Breakdown
  const priorityBreakdown = useMemo(() => getPriorityBreakdown(filteredData), [filteredData]);

  // Problem Category Heatmap
  const problemHeatmap = useMemo(() => getProblemCategoryHeatmap(filteredData), [filteredData]);

  // Performance Analysis Data
  const ratingByDept = useMemo(() => getRatingByDepartment(filteredData), [filteredData]);
  const slaRateByDept = useMemo(() => getSLARateByDepartment(filteredData), [filteredData]);
  const slaPriorityMatrix = useMemo(() => getSLAPriorityMatrix(filteredData), [filteredData]);
  const categoryEfficiency = useMemo(() => getCategoryEfficiency(filteredData), [filteredData]);
  const workgroupVol = useMemo(() => getWorkgroupVolume(filteredData), [filteredData]);
  const ticketAging = useMemo(() => getTicketAgingDistribution(filteredData), [filteredData]);
  const autoInsights = useMemo(() => generateInsights(filteredData), [filteredData]);

  const mttrDist = useMemo(() => getMTTRDistribution(filteredData), [filteredData]);
  const priorityTrend = useMemo(() => getVolumeByPriorityTrend(filteredData), [filteredData]);
  const agentPerf = useMemo(() => getAgentPerformance(filteredData), [filteredData]);
  const timeHeatmap = useMemo(() => getTimeBasisHeatmap(filteredData), [filteredData]);
  const escalationAnalysis = useMemo(() => getEscalationAnalysis(filteredData), [filteredData]);

  // Top Talkers
  const topTalkersData = useMemo(() => getTopTalkers(filteredData, topLimit), [filteredData, topLimit]);

  // Department Breakdown (Treemap)
  const departmentTreemapData = useMemo(() => {
    const deptCounts: Record<string, number> = {};
    filteredData.forEach((t) => {
      const dept = t["Department Display name"] || "Unknown";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    return Object.entries(deptCounts)
      .map(([name, value]) => ({
        name,
        value,
        fill: PIE_COLORS[Math.floor(Math.random() * PIE_COLORS.length)],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // SLA breach donut chart
  const slaBreachData = useMemo(() => {
    const breaches = filteredData.filter(
      (t) => (t["Resolution SLA - Violation"] || "").toString().toLowerCase() === "yes"
    ).length;
    const compliant = filteredData.length - breaches;

    return [
      { name: "Compliant", value: compliant, fill: "#10b981" },
      { name: "Breached", value: breaches, fill: "#ef4444" },
    ];
  }, [filteredData]);

  // Generate insights
  const insights = useMemo(() => {
    // Compare with previous period (last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentPeriod = filterTickets(data, {
      dateRange: { start: thirtyDaysAgo, end: now },
    });

    const previousPeriod = filterTickets(data, {
      dateRange: { start: sixtyDaysAgo, end: thirtyDaysAgo },
    });

    return generateInsights(currentPeriod, previousPeriod);
  }, [data, filteredData]);

  // AI Insights
  const [aiInsights, setAiInsights] = useState<string>("");
  const [generatingInsights, setGeneratingInsights] = useState(false);

  const generateAIInsights = useCallback(async () => {
    setGeneratingInsights(true);
    try {
      const params = new URLSearchParams();
      if (filters.department) params.set("department", filters.department);
      if (filters.category) params.set("category", filters.category);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.dateRange?.start) {
        params.set("from", filters.dateRange.start.toISOString().split("T")[0]);
      }
      if (filters.dateRange?.end) {
        params.set("to", filters.dateRange.end.toISOString().split("T")[0]);
      }

      const res = await fetch(`/api/ai/insights?${params.toString()}`);
      const data = await res.json();
      setAiInsights(data.insights || "Unable to generate insights.");
    } catch (error) {
      console.error("Failed to generate insights:", error);
      setAiInsights("Error generating insights. Please try again.");
    } finally {
      setGeneratingInsights(false);
    }
  }, [filters]);

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const csv = [
      Object.keys(filteredData[0] || {}).join(","),
      ...filteredData.map((t) =>
        Object.values(t)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredData]);

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-300 mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.length) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Card className="p-8">
          <p className="text-slate-600 dark:text-slate-400">No data found. Please check your data source.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-[1920px] space-y-6 p-6 md:p-8 lg:p-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="mt-1.5 text-sm md:text-base text-slate-600 dark:text-slate-400">
              Power BI-style insights for your support operations
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button onClick={fetchData} variant="outline" size="sm" className="h-9">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={handleExportPDF} variant="outline" size="sm" className="h-9">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Filters</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <Label htmlFor="department" className="text-sm font-medium">Department</Label>
              <Select
                value={filters.department || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, department: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger id="department" className="mt-1.5">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category" className="text-sm font-medium">Category</Label>
              <Select
                value={filters.category || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, category: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger id="category" className="mt-1.5">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
              <Select
                value={filters.priority || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, priority: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger id="priority" className="mt-1.5">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorities.map((prio) => (
                    <SelectItem key={prio} value={prio}>
                      {prio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-start" className="text-sm font-medium">Start Date</Label>
              <Input
                id="date-start"
                type="date"
                className="mt-1.5"
                value={filters.dateRange?.start ? filters.dateRange.start.toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : null;
                  setFilters({
                    ...filters,
                    dateRange: {
                      start: newDate,
                      end: filters.dateRange?.end ?? null,
                    },
                  })
                }}
              />
            </div>

            <div>
              <Label htmlFor="date-end" className="text-sm font-medium">End Date</Label>
              <Input
                id="date-end"
                type="date"
                className="mt-1.5"
                value={filters.dateRange?.end ? filters.dateRange.end.toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : null;
                  setFilters({
                    ...filters,
                    dateRange: {
                      start: filters.dateRange?.start ?? null,
                      end: newDate,
                    },
                  })
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <KPIStats kpis={kpis} mtbf={mtbf} />

        {/* Insights Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <InsightsPanel insights={autoInsights} />
        </motion.div>

        {/* Chart Grid - Row 1 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Time Series Area Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <AreaChart
              data={timeSeriesData}
              title="Ticket Volume Over Time"
              granularity="month"
            />
          </motion.div>

          {/* CSAT vs DSAT Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <CSATDSATTrendChart data={csatDsatTrend} />
          </motion.div>
        </div>

        {/* Chart Grid - Row 2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top 10 Problems */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg font-semibold text-left">Top {topLimit} Problems</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Click to filter by problem</p>
                </div>
                <Select value={String(topLimit)} onValueChange={(v) => setTopLimit(Number(v))}>
                  <SelectTrigger className="w-[80px] h-8 text-xs">
                    <SelectValue placeholder="Limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <Top10IssuesChart data={topProblemsData} onBarClick={handleProblemClick} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Top 10 Solutions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-left">Top {topLimit} Solutions</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Most applied resolutions</p>
              </CardHeader>
              <CardContent>
                <div style={{ height: Math.max(400, topSolutionsData.length * 35 + 80), maxHeight: '600px', overflowY: 'auto' }}>
                  <ResponsiveContainer width="100%" height={Math.max(400, topSolutionsData.length * 35 + 80)}>
                    <BarChart
                      data={topSolutionsData}
                      layout="vertical"
                      margin={{ top: 20, right: 60, left: 160, bottom: 20 }}
                      barSize={20}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                      <XAxis
                        type="number"
                        stroke="#94a3b8"
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b" }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        stroke="#94a3b8"
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b" }}
                        tickMargin={12}
                        interval={0}
                        tickFormatter={(value) => {
                          const maxLength = 15;
                          if (value && value.length > maxLength) {
                            return value.substring(0, maxLength - 2) + "..";
                          }
                          return value || "";
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "none",
                          borderRadius: "12px",
                          padding: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        }}
                        formatter={(val: any) => [Number(val).toLocaleString(), "Tickets"]}
                      />
                      <Bar
                        dataKey="count"
                        fill="#3b82f6"
                        radius={[0, 4, 4, 0]}
                        animationDuration={1500}
                        onClick={(data) => setFilters(f => ({ ...f, category: data.name }))}
                        className="cursor-pointer"
                      >
                        <LabelList
                          dataKey="count"
                          position="right"
                          formatter={(val: any) => Number(val).toLocaleString()}
                          style={{ fill: "#4b5563", fontSize: "11px", fontWeight: 600 }}
                          offset={10}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Chart Grid - Row 3 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <SLAPriorityMatrix data={slaPriorityMatrix} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <TicketTypeDistributionChart data={ticketTypeDist} onTypeClick={handleTypeClick} />
          </motion.div>
        </div>

        {/* Efficiency Analysis Row */}
        <div className="grid grid-cols-1 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <CategoryEfficiencyScatter data={categoryEfficiency} />
          </motion.div>
        </div>

        {/* Chart Grid - Row 4 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Priority Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            <PriorityBreakdownChart data={priorityBreakdown} onPriorityClick={handlePriorityClick} />
          </motion.div>

          {/* SLA Breach Donut */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-left">SLA Breach Analysis</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Compliance vs violations</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                      <Pie
                        data={slaBreachData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={140}
                        paddingAngle={5}
                        dataKey="value"
                        label={(entry: any) => `${entry.name}: ${Number(entry.value).toLocaleString()}`}
                        fontSize={11}
                        animationDuration={1500}
                      >
                        {slaBreachData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.2)" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "none",
                          borderRadius: "12px",
                          padding: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Chart Grid - Row 5 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Talkers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-4 hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-left">Top Talkers</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Users with most tickets</p>
              </CardHeader>
              <CardContent>
                <div style={{ height: Math.max(400, topTalkersData.length * 35 + 80), maxHeight: '600px', overflowY: 'auto' }}>
                  <ResponsiveContainer width="100%" height={Math.max(400, topTalkersData.length * 35 + 80)}>
                    <BarChart
                      data={topTalkersData}
                      layout="vertical"
                      margin={{ top: 20, right: 60, left: 140, bottom: 20 }}
                      barSize={20}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                      <XAxis
                        type="number"
                        stroke="#94a3b8"
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b" }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        stroke="#94a3b8"
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b" }}
                        tickMargin={10}
                        interval={0}
                        tickFormatter={(val) => val.length > 15 ? val.substring(0, 12) + '..' : val}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "none",
                          borderRadius: "12px",
                          padding: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        }}
                        formatter={(val: any) => [Number(val).toLocaleString(), "Tickets"]}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} animationDuration={1500}>
                        <LabelList
                          dataKey="count"
                          position="right"
                          formatter={(val: any) => Number(val).toLocaleString()}
                          style={{ fill: "#4b5563", fontSize: "11px", fontWeight: 600 }}
                          offset={10}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Department Breakdown Treemap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
          >
            <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-5 hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 px-0">
                <CardTitle className="text-lg font-bold text-left flex items-center gap-2">
                  <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                  Department Breakdown
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left px-4">Hierarchical ticket volume distribution</p>
              </CardHeader>
              <CardContent className="px-0">
                <ResponsiveContainer width="100%" height={400}>
                  <Treemap
                    data={departmentTreemapData}
                    dataKey="value"
                    stroke="#fff"
                    fill="#4f46e5"
                  >
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "none",
                        borderRadius: "12px",
                        padding: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                      formatter={(val: any) => [Number(val).toLocaleString(), "Tickets"]}
                    />
                  </Treemap>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* DSAT Analysis Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="space-y-6 pt-8 border-t border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-950/30 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">DSAT Deep Dive Analysis</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Analyzing patterns in customer dissatisfaction</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-4 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-md font-semibold text-red-600 dark:text-red-400">DSAT By Category</CardTitle>
                <p className="text-[10px] text-slate-500">Click to focus on category</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dsatAnalysis.byType} layout="vertical" margin={{ left: 0, right: 40 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={10}
                      width={60}
                      tick={{ fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => val.length > 10 ? val.substring(0, 8) + '..' : val}
                    />
                    <Tooltip contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                    <Bar
                      dataKey="count"
                      fill="#ef4444"
                      radius={[0, 4, 4, 0]}
                      onClick={(data) => setFilters(f => ({ ...f, category: data.name }))}
                      className="cursor-pointer"
                    >
                      <LabelList dataKey="count" position="right" fontSize={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-4 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-md font-semibold text-orange-600 dark:text-orange-400">DSAT By Location</CardTitle>
                <p className="text-[10px] text-slate-500">Click to focus on location</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dsatAnalysis.byLocation} layout="vertical" margin={{ left: 0, right: 40 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={10}
                      width={60}
                      tick={{ fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => val.length > 10 ? val.substring(0, 8) + '..' : val}
                    />
                    <Tooltip contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                    <Bar
                      dataKey="count"
                      fill="#f97316"
                      radius={[0, 4, 4, 0]}
                      onClick={(data) => setFilters(f => ({ ...f, department: data.name }))}
                      className="cursor-pointer"
                    >
                      <LabelList dataKey="count" position="right" fontSize={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-4 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-md font-semibold text-purple-600 dark:text-purple-400">DSAT By Engineer</CardTitle>
                <p className="text-[10px] text-slate-500">Resource hotspots</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dsatAnalysis.byEngineer} layout="vertical" margin={{ left: 0, right: 40 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={10}
                      width={60}
                      tick={{ fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => val.length > 10 ? val.substring(0, 8) + '..' : val}
                    />
                    <Tooltip contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="count" position="right" fontSize={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Problem Category Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          <ProblemCategoryHeatmap data={problemHeatmap} />
        </motion.div>

        {/* Performance & Support Matrix */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Average Rating by Department */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.5 }}>
            <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-5 border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Satisfaction by Department
                </CardTitle>
                <p className="text-xs text-slate-500">Average customer rating (Scale 1-5)</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ratingByDept} layout="vertical" margin={{ left: 20, right: 40 }}>
                    <XAxis type="number" domain={[0, 5]} hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={11}
                      width={100}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => val.length > 15 ? val.substring(0, 12) + '..' : val}
                    />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="rating" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="rating" position="right" fontSize={11} fontWeight={600} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* SLA Compliance Rate by Department */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6 }}>
            <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-5 border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  SLA Compliance Score
                </CardTitle>
                <p className="text-xs text-slate-500">% of tickets resolved within SLA</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={slaRateByDept} layout="vertical" margin={{ left: 20, right: 40 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={11}
                      width={100}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => val.length > 15 ? val.substring(0, 12) + '..' : val}
                    />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="rate" fill="#10b981" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="rate" position="right" fontSize={11} fontWeight={600} formatter={(v: any) => `${v}%`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Workgroup Volume Analysis */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7 }}>
            <WorkgroupVolumeChart data={workgroupVol} />
          </motion.div>

          {/* Ticket Aging Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}>
            <TicketAgingChart data={ticketAging} />
          </motion.div>
        </div>

        {/* Interactive Ticket Table */}
        {/* Data Scientist Row: Trends & Distribution */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-950/30 rounded-lg">
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Expert Data Science Insights</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Deep-dive technical analysis for management review</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <PriorityTrendChart data={priorityTrend} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <MTTRDistributionChart data={mttrDist} />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <OperationalHeatmap data={timeHeatmap} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <AgentPerformanceChart data={agentPerf} />
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <TicketTable tickets={filteredData} pageSize={10} />
        </motion.div>

        {/* AI-Generated Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
        >
          <Card className="shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    AI-Generated Insights
                  </CardTitle>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Natural-language summary with anomaly detection</p>
                </div>
                <Button
                  onClick={generateAIInsights}
                  variant="outline"
                  size="sm"
                  disabled={generatingInsights}
                >
                  {generatingInsights ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Generate Insights
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiInsights ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-sans bg-white dark:bg-slate-800 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
                    {aiInsights}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p>Click "Generate Insights" to get AI-powered analytics summary</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <AnalyticsDashboard />
    </Suspense>
  );
}
