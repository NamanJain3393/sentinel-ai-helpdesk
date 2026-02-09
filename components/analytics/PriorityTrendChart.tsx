"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PriorityTrendChartProps {
    data: { date: string; P1: number; P2: number; P3: number; P4: number; Total: number }[];
}

export default function PriorityTrendChart({ data }: PriorityTrendChartProps) {
    return (
        <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
            <CardHeader className="pb-3 px-0">
                <CardTitle className="text-lg font-bold text-left px-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-purple-500 rounded-full" />
                    Priority Volume Trends
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left px-8">Stacked volume of tickets by priority (P1-P4)</p>
            </CardHeader>
            <CardContent className="px-0">
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart
                        data={data}
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
                        />
                        <YAxis
                            stroke="#94a3b8"
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#64748b" }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.95)",
                                border: "none",
                                borderRadius: "12px",
                                padding: "12px",
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="P1" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="P2" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="P3" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="P4" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.6} />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
