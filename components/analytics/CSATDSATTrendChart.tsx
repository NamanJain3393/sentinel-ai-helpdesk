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

interface CSATDSATTrendChartProps {
  data: { month: string; csat: number; dsat: number; count: number }[];
}

export default function CSATDSATTrendChart({ data }: CSATDSATTrendChartProps) {
  return (
    <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-left text-slate-900 dark:text-slate-100">CSAT vs DSAT Trend</CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Month-wise satisfaction comparison</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
            <XAxis
              dataKey="month"
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
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                padding: "12px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
            />
            <Legend verticalAlign="top" height={36} />
            <Line
              type="monotone"
              dataKey="csat"
              stroke="#10b981"
              strokeWidth={4}
              dot={{ fill: "#10b981", strokeWidth: 2, r: 4, stroke: "#fff" }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="CSAT (%)"
              animationDuration={1500}
            />
            <Line
              type="monotone"
              dataKey="dsat"
              stroke="#ef4444"
              strokeWidth={4}
              dot={{ fill: "#ef4444", strokeWidth: 2, r: 4, stroke: "#fff" }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="DSAT (%)"
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

