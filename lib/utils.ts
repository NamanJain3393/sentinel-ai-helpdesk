import { getSupabaseClient, getLatestMetrics, listIssues, listSolutionsByModelAndType, createIssue, upsertSolution, IssueStatus, Metrics as MetricsRow, Solution as SolutionRow, Issue as IssueRow, NewIssue } from "@/lib/db";
import { getChatCompletionText } from "@/lib/openrouter";

type ResultOk<T> = { ok: true; data: T };
type ResultErr = { ok: false; error: string; details?: unknown };
export type Result<T> = ResultOk<T> | ResultErr;

export type MetricsPayload = {
  csat: number;
  dsat: number;
  mttr: number; // minutes
  mtbr: number; // hours
  avg_response_time: number; // ms
  total_issues: number;
  created_at?: string;
};

export async function getMetrics(): Promise<Result<MetricsPayload>> {
  try {
    const latest = await getLatestMetrics();
    if (latest) {
      const payload: MetricsPayload = {
        csat: latest.csat,
        dsat: latest.dsat,
        mttr: latest.mttr,
        mtbr: latest.mtbr,
        avg_response_time: latest.avg_response_time,
        total_issues: latest.total_issues,
        created_at: latest.created_at,
      };
      return { ok: true, data: payload };
    }

    const supabase = getSupabaseClient();
    const { data: issues, error } = await supabase
      .from("issues")
      .select("id, status, created_at, updated_at")
      .order("created_at", { ascending: true });
    if (error) throw error;

    const totalIssues = issues?.length ?? 0;
    if (!issues || issues.length === 0) {
      return {
        ok: true,
        data: { csat: 0, dsat: 100, mttr: 0, mtbr: 0, avg_response_time: 0, total_issues: 0 },
      };
    }

    const resolved = issues.filter(i => (i as any).status === "resolved");
    const csat = totalIssues > 0 ? (resolved.length / totalIssues) * 100 : 0;
    const dsat = Math.max(0, 100 - csat);

    const mttr = (() => {
      if (resolved.length === 0) return 0;
      const diffs = resolved.map(i => {
        const created = new Date((i as any).created_at).getTime();
        const updated = new Date((i as any).updated_at ?? (i as any).created_at).getTime();
        return Math.max(0, updated - created) / (1000 * 60);
      }).filter(Number.isFinite);
      if (diffs.length === 0) return 0;
      return diffs.reduce((a, b) => a + b, 0) / diffs.length;
    })();

    const mtbr = (() => {
      if (issues.length < 2) return 0;
      const times = issues.map(i => new Date((i as any).created_at).getTime());
      const gaps: number[] = [];
      for (let i = 1; i < times.length; i++) {
        gaps.push(Math.max(0, times[i] - times[i - 1]) / (1000 * 60 * 60));
      }
      if (gaps.length === 0) return 0;
      return gaps.reduce((a, b) => a + b, 0) / gaps.length;
    })();

    const avg_response_time = Math.round(600 + Math.random() * 600);

    return {
      ok: true,
      data: {
        csat: Number(csat.toFixed(2)),
        dsat: Number(dsat.toFixed(2)),
        mttr: Number(mttr.toFixed(2)),
        mtbr: Number(mtbr.toFixed(2)),
        avg_response_time,
        total_issues: totalIssues,
      },
    };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? "Failed to get metrics", details: error };
  }
}

export async function findSolution(issue_type: string, model: string): Promise<Result<{ found: boolean; solution?: SolutionRow }>> {
  try {
    const solutions = await listSolutionsByModelAndType(model, issue_type);
    if (solutions.length > 0) {
      return { ok: true, data: { found: true, solution: solutions[0] } };
    }
    return { ok: true, data: { found: false } };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? "Failed to find solution", details: error };
  }
}

export type RecordIssueInput = {
  company: string;
  model: string;
  issue_type: string;
  description: string;
  status?: IssueStatus;
  ai_generated?: boolean;
};

export async function recordIssue(input: RecordIssueInput): Promise<Result<IssueRow>> {
  try {
    const payload: NewIssue & { ai_generated?: boolean } = {
      company: input.company,
      model: input.model,
      issue_type: input.issue_type,
      description: input.description,
      status: input.status ?? "open",
      ai_generated: input.ai_generated,
    };

    try {
      const issue = await createIssue(payload);
      return { ok: true, data: issue };
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      const columnMissing = /column\s+"ai_generated"\s+does not exist/i.test(msg);
      if (columnMissing) {
        const fallback: NewIssue = {
          company: input.company,
          model: input.model,
          issue_type: input.issue_type,
          description: input.description,
          status: input.status ?? "open",
        };
        const issue = await createIssue(fallback);
        return { ok: true, data: issue };
      }
      throw e;
    }
  } catch (error: any) {
    return { ok: false, error: error?.message ?? "Failed to record issue", details: error };
  }
}

export async function addSolution(issue_type: string, model: string, solution_text: string): Promise<Result<SolutionRow>> {
  try {
    const solution = await upsertSolution({ issue_type, model, solution_text });
    return { ok: true, data: solution };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? "Failed to upsert solution", details: error };
  }
}

export async function generateGPTSolution(description: string): Promise<Result<{ text: string }>> {
  try {
    const text = await getChatCompletionText([
      {
        role: "system",
        content: "You are a helpful technical support assistant. Provide concise, actionable troubleshooting steps.",
      },
      {
        role: "user",
        content: `Issue description:\n${description}\n\nProvide clear troubleshooting steps.`,
      },
    ]);
    return { ok: true, data: { text } };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? "Failed to generate GPT solution", details: error };
  }
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
