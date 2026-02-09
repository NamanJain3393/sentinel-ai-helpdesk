"use client";

import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OperationalHeatmapProps {
    data: { day: string; hour: number; count: number; avgRating: number }[];
}

export default function OperationalHeatmap({ data }: OperationalHeatmapProps) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Map day names to numbers
    const dayToNum = (day: string) => days.indexOf(day);

    const formattedData = data.map(d => ({
        ...d,
        x: d.hour,
        y: dayToNum(d.day)
    }));

    const getColor = (value: number) => {
        if (value === 0) return "#f1f5f9";
        if (value < 5) return "#dcfce7";
        if (value < 10) return "#bbf7d0";
        if (value < 20) return "#86efac";
        if (value < 40) return "#4ade80";
        return "#22c55e";
    };

    return (
        <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
            <CardHeader className="pb-3 px-0">
                <CardTitle className="text-lg font-bold text-left px-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                    Support Load Heatmap
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left px-8">Identifying peak hours and day-wise ticket spikes</p>
            </CardHeader>
            <CardContent className="px-0 pt-6">
                <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="Hour"
                            domain={[0, 23]}
                            ticks={hours.filter(h => h % 2 === 0)}
                            tickFormatter={(h) => `${h}:00`}
                            fontSize={10}
                            stroke="#94a3b8"
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Day"
                            domain={[0, 6]}
                            ticks={[0, 1, 2, 3, 4, 5, 6]}
                            tickFormatter={(y) => days[y]?.substring(0, 3) || ""}
                            fontSize={10}
                            stroke="#94a3b8"
                            axisLine={false}
                            tickLine={false}
                        />
                        <ZAxis type="number" dataKey="count" range={[50, 400]} />
                        <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.95)",
                                border: "none",
                                borderRadius: "12px",
                                padding: "12px",
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            }}
                            formatter={(value: any, name: string) => [value, name === "x" ? "Hour" : name === "y" ? "Day" : name]}
                        />
                        <Scatter name="Tickets" data={formattedData}>
                            {formattedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColor(entry.count)} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
