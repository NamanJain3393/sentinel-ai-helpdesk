"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface SLAComplianceGaugeProps {
  data: Array<{ name: string; value: number; fill: string }>;
}

export default function SLAComplianceGauge({ data }: SLAComplianceGaugeProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const compliant = data.find((d) => d.name === "Compliant")?.value || 0;
  const complianceRate = total > 0 ? (compliant / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl font-bold text-slate-900">{complianceRate.toFixed(1)}%</div>
        <div className="text-sm text-slate-600">SLA Compliance Rate</div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
            label={(entry: any) => `${entry.name}: ${entry.value}`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
