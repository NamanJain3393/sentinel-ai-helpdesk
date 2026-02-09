import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { getSupabaseClient } from "@/lib/db";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "Monthly_Report.csv");
    const fileContent = fs.readFileSync(filePath, "utf8");
    const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

    const supabase = getSupabaseClient();

    const rows = (parsed.data as any[]).slice(0, 1000).map((r) => ({
      description: r["Description"] ?? null,
      solution: r["Solution"] ?? null,
      department: r["Department Display name"] ?? null,
      created_at: r["Created Time"] ?? null,
    }));

    const { error } = await supabase.from("tickets").upsert(rows, { onConflict: "description,created_at" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, upserted: rows.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to ingest" }, { status: 500 });
  }
}


