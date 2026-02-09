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

interface AgentPerformanceChartProps {
    data: { name: string; count: number; mttr: number; slaRate: number }[];
}

export default function AgentPerformanceChart({ data }: AgentPerformanceChartProps) {
    return (
        <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
            <CardHeader className="pb-3 px-0">
                <CardTitle className="text-lg font-bold text-left px-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-blue-500 rounded-full" />
                    Top Performing Agents
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left px-8">Tickets handled vs SLA compliance</p>
            </CardHeader>
            <CardContent className="px-0">
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#64748b" }}
                            tickFormatter={(val) => val.split(" ")[0]}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="#94a3b8"
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#64748b" }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#94a3b8"
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#64748b" }}
                            unit="%"
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
                        <Bar yAxisId="left" dataKey="count" name="Tickets Resolved" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="slaRate" name="SLA Met %" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
