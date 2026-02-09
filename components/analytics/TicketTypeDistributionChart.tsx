"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TicketTypeDistributionChartProps {
  data: { name: string; value: number }[];
  onTypeClick?: (type: string) => void;
}

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function TicketTypeDistributionChart({ data, onTypeClick }: TicketTypeDistributionChartProps) {
  return (
    <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-left">Ticket Type Distribution</CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Incidents vs Requests vs Failures</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={(entry: any) => {
                const total = data.reduce((sum, d) => sum + d.value, 0);
                const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
                return `${entry.name} (${percent}%)`;
              }}
              outerRadius={130}
              innerRadius={80}
              paddingAngle={5}
              dataKey="value"
              fontSize={11}
              stroke="none"
              animationDuration={1500}
              onClick={(data) => onTypeClick?.(data.name)}
              className="cursor-pointer"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
              formatter={(val: any) => [Number(val).toLocaleString(), "Tickets"]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

