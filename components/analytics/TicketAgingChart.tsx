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

interface TicketAgingChartProps {
    data: { name: string; count: number }[];
}

const GET_COLOR = (name: string) => {
    if (name.includes("> 10") || name.includes("5 to 10")) return "#ef4444";
    if (name.includes("2 to 5")) return "#f97316";
    if (name.includes("1 to 2")) return "#eab308";
    return "#10b981";
};

export default function TicketAgingChart({ data }: TicketAgingChartProps) {
    return (
        <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200/80 dark:border-slate-800/80">
            <CardHeader className="pb-3 px-6">
                <CardTitle className="text-lg font-bold text-left flex items-center gap-2">
                    <div className="w-2 h-6 bg-orange-500 rounded-full" />
                    Ticket Aging Analysis
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Distribution of open and resolved tickets by age</p>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                            <XAxis
                                dataKey="name"
                                fontSize={10}
                                stroke="#64748b"
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis fontSize={10} stroke="#64748b" tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                                    border: "none",
                                    borderRadius: "12px",
                                    padding: "12px",
                                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={1500}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={GET_COLOR(entry.name)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
