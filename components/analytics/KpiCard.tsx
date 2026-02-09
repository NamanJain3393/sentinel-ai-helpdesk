"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  borderColor?: string;
  delay?: number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  formula?: string;
}

import { Info } from "lucide-react";

export default function KpiCard({
  title,
  value,
  subtitle,
  borderColor = "blue",
  delay = 0,
  icon,
  trend,
  trendValue,
  formula,
}: KpiCardProps) {
  const borderColors: Record<string, string> = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    purple: "border-l-purple-500",
    teal: "border-l-teal-500",
    orange: "border-l-orange-500",
    red: "border-l-red-500",
    indigo: "border-l-indigo-500",
  };

  const gradientColors: Record<string, string> = {
    blue: "from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20",
    green: "from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20",
    purple: "from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20",
    teal: "from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/20",
    orange: "from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20",
    red: "from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20",
    indigo: "from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className={`bg-gradient-to-br ${gradientColors[borderColor] || gradientColors.blue} rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${borderColors[borderColor] || borderColors.blue} border-l-4 border border-slate-200/80 dark:border-slate-800/80 p-5`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                {title}
              </CardTitle>
              {formula && (
                <div className="group relative">
                  <Info className="h-3 w-3 text-slate-400 cursor-help opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50">
                    <div className="bg-slate-900 text-white text-[10px] p-2 rounded shadow-xl whitespace-nowrap border border-slate-700">
                      <span className="font-bold text-indigo-400">Formula:</span> {formula}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {icon && <div className="text-slate-500 dark:text-slate-400">{icon}</div>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
          {subtitle && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={`mt-2 text-xs flex items-center gap-1 ${trend === "up" ? "text-green-600 dark:text-green-400" :
              trend === "down" ? "text-red-600 dark:text-red-400" :
                "text-slate-600 dark:text-slate-400"
              }`}>
              {trend === "up" && "↑"}
              {trend === "down" && "↓"}
              {trendValue}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

