"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface ProblemCategoryHeatmapProps {
  data: { category: string; avgResolutionTime: number; ticketCount: number }[];
}

export default function ProblemCategoryHeatmap({ data }: ProblemCategoryHeatmapProps) {
  const [activeTier, setActiveTier] = useState<string | null>(null);

  // Performance tier thresholds
  const getTier = (time: number, maxTime: number) => {
    const ratio = time / maxTime;
    if (ratio > 0.8) return "Critical";
    if (ratio > 0.5) return "At Risk";
    if (ratio > 0.3) return "Standard";
    return "Optimum";
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Critical": return "#ef4444";
      case "At Risk": return "#f97316";
      case "Standard": return "#eab308";
      case "Optimum": return "#10b981";
      default: return "#64748b";
    }
  };

  const maxTime = useMemo(() => Math.max(...data.map((d) => d.avgResolutionTime), 1), [data]);

  const filteredData = useMemo(() => {
    if (!activeTier) return data;
    return data.filter(d => getTier(d.avgResolutionTime, maxTime) === activeTier);
  }, [data, activeTier, maxTime]);

  return (
    <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-left">Problem Category Heatmap</CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Issue types vs resolution time correlation</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(300, filteredData.length * 30 + 80)}>
          <BarChart
            data={filteredData}
            layout="vertical"
            margin={{ top: 20, right: 60, left: 100, bottom: 20 }}
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
              dataKey="category"
              type="category"
              width={100}
              stroke="#94a3b8"
              fontSize={10}
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
              formatter={(value: number, name: string) => {
                if (name === "Avg Resolution Time") return [`${value.toFixed(1)} min`, name];
                return [value, name];
              }}
            />
            <Bar
              dataKey="avgResolutionTime"
              radius={[0, 4, 4, 0]}
              name="Avg Resolution Time"
              animationDuration={1500}
            >
              {filteredData.map((entry, index) => {
                const tier = getTier(entry.avgResolutionTime, maxTime);
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={getTierColor(tier)}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[10px] uppercase tracking-wider font-bold">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTier(activeTier === "Optimum" ? null : "Optimum")}
            className={cn("h-8 gap-2 rounded-full", activeTier === "Optimum" ? "bg-green-100 text-green-700 hover:bg-green-200" : "text-slate-500")}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            Optimum
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTier(activeTier === "Standard" ? null : "Standard")}
            className={cn("h-8 gap-2 rounded-full", activeTier === "Standard" ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "text-slate-500")}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            Standard
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTier(activeTier === "At Risk" ? null : "At Risk")}
            className={cn("h-8 gap-2 rounded-full", activeTier === "At Risk" ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "text-slate-500")}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
            At Risk
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTier(activeTier === "Critical" ? null : "Critical")}
            className={cn("h-8 gap-2 rounded-full", activeTier === "Critical" ? "bg-red-100 text-red-700 hover:bg-red-200" : "text-slate-500")}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            Critical
          </Button>
          {activeTier && (
            <Button variant="link" size="sm" onClick={() => setActiveTier(null)} className="h-8 text-slate-400">
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

