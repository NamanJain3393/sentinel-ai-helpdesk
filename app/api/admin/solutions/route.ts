import { NextResponse } from "next/server";
import { getSupabaseClient, upsertSolution } from "@/lib/db";

type UpsertSolutionBody = {
  // New format (matching database schema)
  question?: string;
  solution?: string;
  // Legacy format (for backward compatibility)
  issue_type?: string;
  model?: string;
  solution_text?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as UpsertSolutionBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Support both new format (question/solution) and legacy format (issue_type/model/solution_text)
    let questionText: string;
    let solutionText: string;

    if (body.question && body.solution) {
      // New format
      questionText = body.question.trim();
      solutionText = body.solution.trim();
    } else if (body.issue_type && body.model && body.solution_text) {
      // Legacy format - convert to new format
      questionText = `${body.issue_type} - ${body.model}`.trim();
      solutionText = body.solution_text.trim();
    } else {
      // Validation
      const errors: Record<string, string> = {};
      if (!isNonEmptyString(body.question) && !isNonEmptyString(body.issue_type)) {
        errors.question = "question (or issue_type) is required";
      }
      if (!isNonEmptyString(body.solution) && !isNonEmptyString(body.solution_text)) {
        errors.solution = "solution (or solution_text) is required";
      }
      if (Object.keys(errors).length > 0) {
        return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
      }
      // Should not reach here, but TypeScript needs this
      questionText = (body.question || `${body.issue_type} - ${body.model}` || "").trim();
      solutionText = (body.solution || body.solution_text || "").trim();
    }

    if (!questionText || !solutionText) {
      return NextResponse.json(
        { error: "question and solution are required" },
        { status: 400 }
      );
    }

    // Upsert solution using new schema
    const solution = await upsertSolution({
      question: questionText,
      solution: solutionText,
    });

    // If legacy format was used, also try to update issues table (if it exists)
    if (body.issue_type && body.model) {
      try {
        const supabase = getSupabaseClient();
        const { error: updateError } = await supabase
          .from("issues")
          .update({ status: "resolved" })
          .eq("issue_type", body.issue_type)
          .eq("model", body.model);

        if (updateError) {
          // Issues table might not exist, log but don't fail
          console.warn("Could not update issues table:", updateError.message);
        }
      } catch (issuesError) {
        // Issues table might not exist, ignore
        console.warn("Issues table not available:", issuesError);
      }
    }

    return NextResponse.json({ success: true, solution }, { status: 200 });
  } catch (err: any) {
    const message = err?.message ?? "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


