import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import Papa from "papaparse";

export async function GET() {
  try {
    // ✅ Correct absolute path
    const filePath = path.join(process.cwd(), "data", "Monthly_Report.csv");
    console.log("📂 Reading file from:", filePath);

    // ✅ Read CSV file
    const fileContent = fs.readFileSync(filePath, "utf8");

    // ✅ Parse CSV
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    console.log("✅ Parsed rows:", parsed.data.length);

    // ✅ Return JSON
    return NextResponse.json(parsed.data);
  } catch (error: any) {
    console.error("❌ Error loading CSV:", error);
    return NextResponse.json(
      { error: "Failed to load CSV file." },
      { status: 500 }
    );
  }
}
