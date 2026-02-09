"use client";

import {
  LineChart,
  Line,
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

interface TimeSeriesData {
  date: string;
  count: number;
  mttr?: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  title?: string;
  granularity?: "day" | "week" | "month";
  onGranularityChange?: (granularity: "day" | "week" | "month") => void;
  showSmoothing?: boolean;
  color?: string;
}

export default function TimeSeriesChart({
  data,
  title = "Ticket Volume Over Time",
  granularity: initialGranularity = "day",
  onGranularityChange,
  showSmoothing = true,
  color = "#10b981",
}: TimeSeriesChartProps) {
  const [granularity, setGranularity] = useState<"day" | "week" | "month">(initialGranularity);
  const [smoothing, setSmoothing] = useState(showSmoothing);

  // Aggregate data by granularity
  const aggregatedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const grouped: Record<string, { count: number; mttr: number; mttrCount: number }> = {};

    data.forEach((item) => {
      const date = new Date(item.date);
      let key: string;

      if (granularity === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else if (granularity === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = item.date;
      }

      if (!grouped[key]) {
        grouped[key] = { count: 0, mttr: 0, mttrCount: 0 };
      }

      grouped[key].count += item.count || 0;
      if (item.mttr !== undefined && item.mttr > 0) {
        grouped[key].mttr += item.mttr;
        grouped[key].mttrCount += 1;
      }
    });

    return Object.entries(grouped)
      .map(([date, values]) => ({
        date,
        count: values.count,
        mttr: values.mttrCount > 0 ? values.mttr / values.mttrCount : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data, granularity]);

  // Apply smoothing (moving average)
  const smoothedData = useMemo(() => {
    if (!smoothing || aggregatedData.length < 3) return aggregatedData;

    const window = 3;
    return aggregatedData.map((item, idx) => {
      const start = Math.max(0, idx - Math.floor(window / 2));
      const end = Math.min(aggregatedData.length, idx + Math.floor(window / 2) + 1);
      const slice = aggregatedData.slice(start, end);
      const avgCount = slice.reduce((sum, d) => sum + d.count, 0) / slice.length;
      const avgMttr = slice.reduce((sum, d) => sum + (d.mttr || 0), 0) / slice.length;

      return {
        ...item,
        count: avgCount,
        mttr: avgMttr,
      };
    });
  }, [aggregatedData, smoothing]);

  const handleGranularityChange = (value: "day" | "week" | "month") => {
    setGranularity(value);
    onGranularityChange?.(value);
  };

  return (
    <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-left">{title}</CardTitle>
            <p className="text-xs text-slate-500 mt-1 text-left">
              Time series with {granularity} granularity
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={granularity} onValueChange={handleGranularityChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
            {showSmoothing && (
              <button
                onClick={() => setSmoothing(!smoothing)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${smoothing
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
              >
                {smoothing ? "Smooth" : "Raw"}
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={smoothedData}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b" }}
              angle={-45}
              textAnchor="end"
              height={70}
              tickMargin={10}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              stroke="#94a3b8"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b" }}
              tickMargin={10}
              tickFormatter={(val) => Number(val).toLocaleString()}
            />
            {aggregatedData.some((d) => d.mttr && d.mttr > 0) && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#94a3b8"
                fontSize={11}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b" }}
                tickMargin={10}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                padding: "12px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value: any, name: string) => [
                name === "MTTR (min)" ? `${Number(value).toFixed(1)}m` : Number(value).toLocaleString(),
                name
              ]}
            />
            <Legend verticalAlign="top" height={36} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="count"
              stroke={color}
              strokeWidth={4}
              dot={{ fill: color, strokeWidth: 2, r: 4, stroke: "#fff" }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="Ticket Count"
              animationDuration={1500}
            />
            {aggregatedData.some((d) => d.mttr && d.mttr > 0) && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="mttr"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 3, stroke: "#fff" }}
                name="MTTR (min)"
                strokeDasharray="5 5"
                animationDuration={1500}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

