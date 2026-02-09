"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PriorityBreakdownChartProps {
  data: { name: string; value: number }[];
  onPriorityClick?: (priority: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#10b981",
  Other: "#6b7280",
};

export default function PriorityBreakdownChart({ data, onPriorityClick }: PriorityBreakdownChartProps) {
  return (
    <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-left">Priority Breakdown</CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">High/Medium/Low priority distribution</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
            barSize={40}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b" }}
              tickMargin={10}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b" }}
              tickMargin={10}
              tickFormatter={(val) => Number(val).toLocaleString()}
              domain={[0, 'auto']}
              allowDataOverflow={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                padding: "12px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value: number) => [Number(value).toLocaleString(), "Tickets"]}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              animationDuration={1500}
              onClick={(data) => onPriorityClick?.(data.name || "")}
              className="cursor-pointer"
              minPointSize={5}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || "#6b7280"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

