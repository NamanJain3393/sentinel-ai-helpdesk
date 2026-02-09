"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";

interface AreaChartProps {
  data: { date: string; count: number }[];
  title?: string;
  granularity?: "day" | "week" | "month" | "quarter" | "year";
  onGranularityChange?: (granularity: "day" | "week" | "month" | "quarter" | "year") => void;
  color?: string;
}

export default function AreaChart({
  data,
  title = "Ticket Volume Over Time",
  granularity: initialGranularity = "month",
  onGranularityChange,
  color = "#4f46e5",
}: AreaChartProps) {
  const [granularity, setGranularity] = useState<"day" | "week" | "month" | "quarter" | "year">(initialGranularity);

  const aggregatedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const grouped: Record<string, number> = {};

    data.forEach((item) => {
      const date = new Date(item.date);
      let key: string;

      if (granularity === "year") {
        key = String(date.getFullYear());
      } else if (granularity === "quarter") {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
      } else if (granularity === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else if (granularity === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = item.date;
      }

      grouped[key] = (grouped[key] || 0) + item.count;
    });

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data, granularity]);

  const handleGranularityChange = (value: "day" | "week" | "month" | "quarter" | "year") => {
    setGranularity(value);
    onGranularityChange?.(value);
  };

  return (
    <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-left">{title}</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">
              Dynamic filter by {granularity}
            </p>
          </div>
          <Select value={granularity} onValueChange={handleGranularityChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RechartsAreaChart
            data={aggregatedData}
            margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
          >
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b" }}
              angle={-45}
              textAnchor="end"
              height={70}
              tickMargin={10}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b" }}
              tickMargin={10}
              tickFormatter={(val) => Number(val).toLocaleString()}
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
            <Area
              type="monotone"
              dataKey="count"
              stroke={color}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCount)"
              animationDuration={1500}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

