import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    let supabase: any = null;
    try {
      supabase = getSupabaseClient();
    } catch (e) {
      // Supabase not configured, return empty
      return NextResponse.json({ 
        messages: sessionId ? [] : undefined,
        sessions: sessionId ? undefined : []
      });
    }

    if (sessionId) {
      // Get messages for specific session
      try {
        const { data: messages, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        return NextResponse.json({ messages: messages || [] });
      } catch (e) {
        // Table doesn't exist, return empty
        return NextResponse.json({ messages: [] });
      }
    } else {
      // Get all sessions
      try {
        const { data: sessions, error } = await supabase
          .from("chat_sessions")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        return NextResponse.json({ sessions: sessions || [] });
      } catch (e) {
        // Table doesn't exist, return empty
        return NextResponse.json({ sessions: [] });
      }
    }
  } catch (error: any) {
    // Graceful fallback
    return NextResponse.json({ 
      messages: [],
      sessions: []
    });
  }
}

