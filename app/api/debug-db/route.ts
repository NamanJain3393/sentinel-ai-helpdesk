import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/db";

export async function GET() {
    const results: any = {
        env: {
            hasUrl: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.SUPABASE_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        tests: {}
    };

    try {
        const supabase = getSupabaseClient();

        // Test 1: Simple Select (Check connection & table existence)
        const { data: selectData, error: selectError } = await supabase
            .from("tickets")
            .select("count", { count: "exact", head: true });

        results.tests.select = {
            success: !selectError,
            error: selectError,
            data: selectData
        };

        // Test 2: Insert Dummy Ticket (Check permissions)
        const dummyTicket = {
            ticket_number: `TEST-${Date.now()}`,
            user_email: "test@example.com",
            issue_summary: "Debug Test",
            status: "closed"
        };

        const { data: insertData, error: insertError } = await supabase
            .from("tickets")
            .insert(dummyTicket)
            .select()
            .single();

        results.tests.insert = {
            success: !insertError,
            error: insertError,
            data: insertData
        };

        // Clean up dummy ticket
        if (insertData?.id) {
            await supabase.from("tickets").delete().eq("id", insertData.id);
        }

    } catch (err: any) {
        results.crash = {
            message: err.message,
            stack: err.stack
        };
    }

    return NextResponse.json(results, { status: 200 });
}
