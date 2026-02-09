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
    LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkgroupVolumeChartProps {
    data: { name: string; count: number }[];
}

export default function WorkgroupVolumeChart({ data }: WorkgroupVolumeChartProps) {
    return (
        <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200/80 dark:border-slate-800/80">
            <CardHeader className="pb-3 px-6">
                <CardTitle className="text-lg font-bold text-left flex items-center gap-2">
                    <div className="w-2 h-6 bg-blue-500 rounded-full" />
                    Workgroup Ticket Distribution
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Volume analysis by support team</p>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 5, right: 50, left: 120, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={110}
                                fontSize={10}
                                stroke="#64748b"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val.length > 15 ? val.substring(0, 12) + "..." : val}
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
                            <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} animationDuration={1500} barSize={20}>
                                <LabelList dataKey="count" position="right" fontSize={10} fontWeight={600} fill="#64748b" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
