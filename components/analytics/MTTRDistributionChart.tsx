"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MTTRDistributionChartProps {
    data: { label: string; min: number; max: number; count: number }[];
}

export default function MTTRDistributionChart({ data }: MTTRDistributionChartProps) {
    return (
        <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
            <CardHeader className="pb-3 px-0">
                <CardTitle className="text-lg font-bold text-left px-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-orange-500 rounded-full" />
                    Resolution Time Distribution
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left px-8">Frequency analysis of Mean Time To Resolve (MTTR)</p>
            </CardHeader>
            <CardContent className="px-0">
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis
                            dataKey="label"
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
                            formatter={(value: any) => [value, "Tickets"]}
                        />
                        <Bar dataKey="count" name="Ticket Count" fill="#f97316" radius={[4, 4, 0, 0]} animationDuration={1500}>
                            <LabelList dataKey="count" position="top" fontSize={11} fontWeight={600} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
