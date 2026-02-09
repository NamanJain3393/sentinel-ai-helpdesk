import { NextResponse } from "next/server";
import { listIssues, IssueStatus } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const status = (statusParam ?? undefined) as IssueStatus | undefined;
    const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 100);
    const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0);

    const issues = await listIssues({ status, limit, offset, order: "desc" });

    return NextResponse.json(
      { items: issues, pagination: { limit, offset, count: issues.length } },
      { status: 200 }
    );
  } catch (err: any) {
    const message = err?.message ?? "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


