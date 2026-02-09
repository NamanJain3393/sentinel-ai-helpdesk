"use client";

import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    Tooltip,
    ResponsiveContainer,
    LabelList,
    ReferenceArea,
    CartesianGrid,
    Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EfficiencyScatterProps {
    data: { name: string; volume: number; mttr: number }[];
}

export default function CategoryEfficiencyScatter({ data }: EfficiencyScatterProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-8 flex items-center justify-center border border-slate-200/80 dark:border-slate-800/80 h-[400px]">
                <p className="text-slate-500">No data available for the current selection</p>
            </Card>
        );
    }

    const maxVolume = Math.max(...data.map(d => d.volume), 10);
    const maxMTTR = Math.max(...data.map(d => d.mttr), 10);
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    const avgMTTR = data.reduce((sum, d) => sum + d.mttr, 0) / data.length;

    return (
        <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200/80 dark:border-slate-800/80">
            <CardHeader className="pb-3 px-6 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold text-left flex items-center gap-2">
                        <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                        Category Efficiency Quadrant analysis
                    </CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">Strategic correlation of Ticket Volume vs. Resolution Speed</p>
                </div>
                <div className="flex gap-4 text-[10px] font-semibold uppercase tracking-tight">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400/20" /> Bottlenecks</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400/20" /> Efficiency Leaders</div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[450px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 40, left: 10, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800/50" />

                            {/* Quadrant Shadows */}
                            <ReferenceArea x1={avgVolume} x2={maxVolume * 1.05} y1={avgMTTR} y2={maxMTTR * 1.05} fill="#ef4444" fillOpacity={0.05} />
                            <ReferenceArea x1={0} x2={avgVolume} y1={0} y2={avgMTTR} fill="#10b981" fillOpacity={0.05} />

                            <XAxis
                                type="number"
                                dataKey="volume"
                                name="Volume"
                                stroke="#94a3b8"
                                fontSize={10}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, 'auto']}
                                label={{ value: "Total Ticket Volume (Count)", position: "bottom", fontSize: 10, fill: "#64748b", offset: 10 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="mttr"
                                name="MTTR"
                                stroke="#94a3b8"
                                fontSize={10}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, 'auto']}
                                label={{ value: "Avg Resolution Time (Minutes)", angle: -90, position: "left", fontSize: 10, fill: "#64748b", offset: 20 }}
                            />
                            <ZAxis type="number" range={[100, 800]} />

                            {/* Mean lines */}
                            <ReferenceArea x1={avgVolume - 0.5} x2={avgVolume + 0.5} y1={0} y2={maxMTTR * 1.05} fill="#cbd5e1" />
                            <ReferenceArea x1={0} x2={maxVolume * 1.05} y1={avgMTTR - 1} y2={avgMTTR + 1} fill="#cbd5e1" />

                            <Tooltip
                                cursor={{ stroke: '#6366f1', strokeDasharray: '5 5' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-w-[250px]">
                                                <p className="font-bold text-slate-900 dark:text-white text-xs mb-2 border-b pb-1">
                                                    {data.name}
                                                </p>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-slate-500 text-[10px]">Volume:</span>
                                                        <span className="font-mono text-xs font-bold">{data.volume}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-slate-500 text-[10px]">Avg MTTR:</span>
                                                        <span className="font-mono text-xs font-bold text-indigo-500">{data.mttr} min</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />

                            <Scatter
                                name="Categories"
                                data={data}
                                fill="#6366f1"
                                className="drop-shadow-sm"
                                animationDuration={1000}
                            >
                                {data.map((entry, index) => {
                                    const isBottleneck = entry.volume > avgVolume && entry.mttr > avgMTTR;
                                    const isEfficient = entry.volume > avgVolume && entry.mttr < avgMTTR;
                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={isBottleneck ? "#ef4444" : isEfficient ? "#10b981" : "#6366f1"}
                                            fillOpacity={0.8}
                                            stroke={isBottleneck ? "#fecaca" : isEfficient ? "#a7f3d0" : "#c7d2fe"}
                                            strokeWidth={1}
                                        />
                                    );
                                })}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-6 grid grid-cols-4 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="text-center">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Complexity Zone</span>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">High MTTR / Low Vol</div>
                    </div>
                    <div className="text-center border-x border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] text-red-500 uppercase font-bold mb-1">Bottlenecks</span>
                        <div className="text-xs font-semibold text-red-600 dark:text-red-400">High MTTR / High Vol</div>
                    </div>
                    <div className="text-center border-r border-slate-200 dark:border-slate-700">
                        <span className="block text-[10px] text-emerald-500 uppercase font-bold mb-1">Lead Efficiency</span>
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Low MTTR / High Vol</div>
                    </div>
                    <div className="text-center">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Baseline</span>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Low MTTR / Low Vol</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
