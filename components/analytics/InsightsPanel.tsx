"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Info } from "lucide-react";

interface InsightsPanelProps {
  insights: string[];
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  const getInsightIcon = (insight: string) => {
    if (insight.toLowerCase().includes("increased") || insight.toLowerCase().includes("declined") || insight.toLowerCase().includes("slower")) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    if (insight.toLowerCase().includes("improved") || insight.toLowerCase().includes("decreased") || insight.toLowerCase().includes("faster")) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (insight.toLowerCase().includes("consider") || insight.toLowerCase().includes("review") || insight.toLowerCase().includes("focus")) {
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const getInsightColor = (insight: string) => {
    if (insight.toLowerCase().includes("increased") || insight.toLowerCase().includes("declined") || insight.toLowerCase().includes("slower")) {
      return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
    }
    if (insight.toLowerCase().includes("improved") || insight.toLowerCase().includes("decreased") || insight.toLowerCase().includes("faster")) {
      return "border-l-green-500 bg-green-50 dark:bg-green-950/20";
    }
    if (insight.toLowerCase().includes("consider") || insight.toLowerCase().includes("review") || insight.toLowerCase().includes("focus")) {
      return "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20";
    }
    return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20";
  };

  if (insights.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-left flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Auto-Generated Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            No insights available. Add more data to generate insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-4 border border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-left flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-indigo-500" />
          Auto-Generated Insights
        </CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">
          Key trends and recommendations (Power BI-style)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border-l-4 ${getInsightColor(insight)} border border-slate-200 dark:border-slate-700`}
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(insight)}
                <p className="text-sm text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">
                  {insight}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

