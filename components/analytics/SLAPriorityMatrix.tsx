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

interface SLAMatrixProps {
    data: { priority: string; compliance: number; breach: number }[];
}

export default function SLAPriorityMatrix({ data }: SLAMatrixProps) {
    return (
        <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200/80 dark:border-slate-800/80">
            <CardHeader className="pb-3 px-6">
                <CardTitle className="text-lg font-bold text-left flex items-center gap-2">
                    <div className="w-2 h-6 bg-red-500 rounded-full" />
                    SLA Performance by Priority
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Compliance rate comparison across P1-P4 tiers</p>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                            <XAxis dataKey="priority" fontSize={11} stroke="#64748b" axisLine={false} tickLine={false} />
                            <YAxis fontSize={11} stroke="#64748b" axisLine={false} tickLine={false} unit="%" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                                    border: "none",
                                    borderRadius: "12px",
                                    padding: "12px",
                                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                }}
                                formatter={(val: number) => [`${val.toFixed(1)}%`, "Rate"]}
                            />
                            <Legend />
                            <Bar dataKey="compliance" name="Compliance %" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="breach" name="Breach %" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
