import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const supabase = getSupabaseClient();

        // Fetch last 50 messages ordered by time
        const { data, error } = await supabase
            .from("chat_history")
            .select("*")
            .order("created_at", { ascending: true })
            .limit(50);

        if (error) {
            console.error("Error fetching chat history:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ messages: data || [] });
    } catch (err: any) {
        console.error("Server error fetching history:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
