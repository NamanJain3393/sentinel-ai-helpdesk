"use client";

import React from "react";
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

interface TopIssuesChartProps {
  data: { name: string; count: number }[];
  onBarClick?: (problemName: string) => void;
  title?: string;
  limit?: number;
}

export default function TopIssuesChart({ data, onBarClick, title = "Top Problems", limit = 10 }: TopIssuesChartProps) {
  // Use data as is (already sliced by parent) or slice here
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  // Calculate dynamic height: ~35px per bar + some padding for axes
  // For 10 bars -> 400px, For 50 bars -> 1750px
  const dynamicHeight = Math.max(400, sortedData.length * 35 + 80);

  return (
    <div className="w-full">
      <div className="h-full overflow-y-auto" style={{ maxHeight: '600px' }}>
        <ResponsiveContainer width="100%" height={dynamicHeight}>
          <BarChart
            data={sortedData}
            margin={{ top: 20, right: 60, left: 100, bottom: 20 }}
            layout="vertical"
            barSize={20}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={true} horizontal={false} />
            <XAxis
              type="number"
              stroke="#6b7280"
              fontSize={11}
              tickMargin={10}
              tick={{ fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={100}
              stroke="#94a3b8"
              fontSize={11}
              tick={{ fill: "#64748b" }}
              tickMargin={12}
              axisLine={false}
              tickLine={false}
              interval={0}
              tickFormatter={(value) => {
                const maxLength = 15;
                if (value && value.length > maxLength) {
                  return value.substring(0, 12) + "..";
                }
                return value || "";
              }}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                padding: "12px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value: any) => [Number(value).toLocaleString(), "Tickets"]}
              labelFormatter={(label) => `Problem: ${label}`}
            />
            <Bar
              dataKey="count"
              fill="#6366F1"
              radius={[0, 4, 4, 0]}
              onClick={(data: any, index: number) => {
                if (onBarClick && sortedData[index]) {
                  onBarClick(sortedData[index].name);
                }
              }}
              style={{ cursor: onBarClick ? "pointer" : "default" }}
            >
              <LabelList
                dataKey="count"
                position="right"
                formatter={(val: any) => Number(val).toLocaleString()}
                style={{
                  fill: "#4b5563",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
                offset={10}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

