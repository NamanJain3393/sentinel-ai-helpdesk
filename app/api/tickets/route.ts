import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/db";
import fs from "fs";
import path from "path";

// Helper to read tickets.json
const readTicketsJSON = (): any[] => {
  try {
    const filePath = path.join(process.cwd(), "data", "tickets.json");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn("Could not read tickets.json:", error);
  }
  return [];
};

// Helper to write tickets.json
const writeTicketsJSON = (tickets: any[]): void => {
  try {
    const filePath = path.join(process.cwd(), "data", "tickets.json");
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(tickets, null, 2), "utf8");
  } catch (error) {
    console.warn("Could not write tickets.json:", error);
  }
};

export async function POST(req: Request) {
  try {
    const { user_email, issue_summary, chat_context, session_id } = await req.json();

    if (!user_email || !issue_summary) {
      return NextResponse.json(
        { error: "user_email and issue_summary are required" },
        { status: 400 }
      );
    }

    // Generate ticket number
    const ticketNumber = `TCKT-${Date.now().toString().slice(-6)}`;
    const ticketData = {
      id: `ticket-${Date.now()}`,
      ticket_number: ticketNumber,
      user_email,
      issue_summary,
      chat_context: chat_context || "",
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_to: null,
      solution: null,
    };

    // Try Supabase first, fallback to JSON file
    let ticket: any = null;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          user_email,
          issue_summary,
          chat_context: chat_context || "",
          status: "open",
          ticket_number: ticketNumber,
        })
        .select()
        .single();

      if (!error && data) {
        ticket = data;
        
        // Also save to JSON for redundancy
        try {
          const tickets = readTicketsJSON();
          tickets.push(ticketData);
          writeTicketsJSON(tickets);
        } catch (jsonError) {
          console.warn("Failed to sync to JSON:", jsonError);
        }
        
        // Mark session as unresolved if session_id provided
        if (session_id) {
          await supabase
            .from("chat_sessions")
            .update({ resolved: false })
            .eq("id", session_id);
        }
      } else {
        throw new Error("Supabase insert failed");
      }
    } catch (supabaseError) {
      // Fallback to JSON file
      console.warn("Supabase unavailable, using tickets.json:", supabaseError);
      const tickets = readTicketsJSON();
      tickets.push(ticketData);
      writeTicketsJSON(tickets);
      ticket = ticketData;
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id || ticketData.id,
        ticket_number: ticketNumber,
        status: ticket.status || "open",
      },
    });
  } catch (error: any) {
    console.error("Ticket creation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create ticket" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Try Supabase first, fallback to JSON file
    let tickets: any[] = [];
    let usingFallback = false;
    
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from("tickets").select("*").order("created_at", { ascending: false }).limit(limit);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (!error && data) {
        tickets = data;
      } else {
        throw new Error(error?.message || "Supabase query failed");
      }
    } catch (supabaseError: any) {
      // Fallback to JSON file
      console.warn("Supabase unavailable, using tickets.json:", supabaseError?.message || supabaseError);
      usingFallback = true;
      tickets = readTicketsJSON();
      
      // Apply filters
      if (status) {
        tickets = tickets.filter((t: any) => t.status === status);
      }
      
      // Sort and limit
      tickets = tickets
        .sort((a: any, b: any) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
        .slice(0, limit);
    }

    return NextResponse.json({ tickets, usingFallback });
  } catch (error: any) {
    console.error("GET tickets error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

