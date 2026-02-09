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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DepartmentPerformanceChartProps {
  data: { name: string; avgResolutionTime: number; totalTickets: number }[];
  onDeptClick?: (dept: string) => void;
}

export default function DepartmentPerformanceChart({ data, onDeptClick }: DepartmentPerformanceChartProps) {
  return (
    <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-left">Department Performance</CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Average resolution time per team</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 60, left: 140, bottom: 40 }}
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
              tickMargin={10}
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
              formatter={(value: number) => [`${value.toFixed(1)} min`, "Avg Resolution Time"]}
            />
            <Bar
              dataKey="avgResolutionTime"
              fill="#8b5cf6"
              radius={[0, 4, 4, 0]}
              name="Avg Resolution Time"
              animationDuration={1500}
              className="cursor-pointer"
              onClick={(data) => onDeptClick?.(data.name)}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

