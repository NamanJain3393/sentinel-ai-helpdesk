import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "missing",
    anon_key_present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service_role_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    openrouter_present: !!process.env.OPENROUTER_API_KEY,
    note: "If any value is missing, fix .env.local and restart the dev server"
  });
}
