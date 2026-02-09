"use client";

import { motion } from "framer-motion";
import KpiCard from "./KpiCard";
import {
  Ticket,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface KPIStatsProps {
  kpis: {
    total: number;
    resolved: number;
    open: number;
    csat: number;
    dsat: number;
    avgResolutionTime: number;
    adjustedMTTR: number;
    avgRating: number;
    reopenedPercent: number;
    escalationRate: number;
    resolvedPercent: string;
  };
  mtbf: number;
}

export default function KPIStats({ kpis, mtbf }: KPIStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        title="Total Tickets"
        value={kpis.total.toLocaleString()}
        subtitle="All time"
        borderColor="blue"
        delay={0.1}
        icon={<Ticket className="h-5 w-5" />}
        formula="Count(All Records in Dataset)"
      />
      <KpiCard
        title="Resolved"
        value={kpis.resolved.toLocaleString()}
        subtitle={`${kpis.resolvedPercent}% of total`}
        borderColor="green"
        delay={0.2}
        icon={<CheckCircle2 className="h-5 w-5" />}
        formula="(Resolved / Total Tickets) * 100"
      />
      <KpiCard
        title="Open Tickets"
        value={kpis.open.toLocaleString()}
        subtitle="Pending resolution"
        borderColor="orange"
        delay={0.3}
        icon={<Clock className="h-5 w-5" />}
        formula="Total - (Closed + Resolved)"
      />
      <KpiCard
        title="CSAT"
        value={`${kpis.csat.toFixed(1)}%`}
        subtitle={`Avg Rating: ${kpis.avgRating}/5`}
        borderColor="teal"
        delay={0.4}
        icon={<TrendingUp className="h-5 w-5" />}
        formula="(Ratings 4+5 / Total Rated) * 100"
      />
      <KpiCard
        title="DSAT"
        value={`${kpis.dsat.toFixed(1)}%`}
        subtitle="Dissatisfaction"
        borderColor="red"
        delay={0.5}
        icon={<AlertTriangle className="h-5 w-5" />}
        formula="(Ratings 1+2 / Total Rated) * 100"
      />
      <KpiCard
        title="Actual MTTR"
        value={`${kpis.avgResolutionTime.toFixed(1)} min`}
        subtitle="Log to Resolved (Total)"
        borderColor="purple"
        delay={0.6}
        icon={<Clock className="h-5 w-5" />}
        formula="Sum(Resolution Duration) / Count(Tickets)"
      />
      <KpiCard
        title="Adjusted MTTR"
        value={`${kpis.adjustedMTTR.toFixed(1)} min`}
        subtitle="Excluding On-Hold Time"
        borderColor="indigo"
        delay={0.7}
        icon={<RefreshCw className="h-5 w-5" />}
        formula="Actual MTTR - Avg Pending Duration"
      />
      <KpiCard
        title="MTBF"
        value={`${mtbf.toFixed(1)} hrs`}
        subtitle="Mean Time Between Failures"
        borderColor="blue"
        delay={0.8}
        icon={<TrendingUp className="h-5 w-5" />}
        formula="(Last Failure - First Failure) / Count(Failures)"
      />
      <KpiCard
        title="Escalation Rate"
        value={`${kpis.escalationRate.toFixed(1)}%`}
        subtitle="High priority tickets"
        borderColor="red"
        delay={0.9}
        icon={<ArrowUp className="h-5 w-5" />}
        formula="(P1 + P2 Tickets / Total) * 100"
      />
      <KpiCard
        title="Reopened %"
        value={`${kpis.reopenedPercent.toFixed(1)}%`}
        subtitle="Tickets reopened"
        borderColor="orange"
        delay={1.0}
        icon={<ArrowDown className="h-5 w-5" />}
        formula="(Reopen Count / Total Tickets) * 100"
      />
    </div>
  );
}

