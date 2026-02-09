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

// PATCH - Update ticket (status, solution, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, solution, assigned_to, issue_summary } = body;

    if (!id) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (solution !== undefined) updateData.solution = solution;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (issue_summary) updateData.issue_summary = issue_summary;

    let updatedTicket: any = null;
    let usingFallback = false;

    // Try Supabase first
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        updatedTicket = data;
      } else {
        throw new Error(error?.message || "Supabase update failed");
      }
    } catch (supabaseError: any) {
      // Fallback to JSON file
      console.warn("Supabase unavailable, using tickets.json:", supabaseError?.message || supabaseError);
      usingFallback = true;
      
      const tickets = readTicketsJSON();
      const ticketIndex = tickets.findIndex((t: any) => t.id === id || t.ticket_number === id);
      
      if (ticketIndex === -1) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      // Update ticket in JSON
      tickets[ticketIndex] = {
        ...tickets[ticketIndex],
        ...updateData,
      };
      
      writeTicketsJSON(tickets);
      updatedTicket = tickets[ticketIndex];
    }

    // If Supabase succeeded, also update JSON for redundancy
    if (!usingFallback && updatedTicket) {
      try {
        const tickets = readTicketsJSON();
        const ticketIndex = tickets.findIndex((t: any) => t.id === id || t.ticket_number === id);
        
        if (ticketIndex !== -1) {
          tickets[ticketIndex] = {
            ...tickets[ticketIndex],
            ...updateData,
          };
          writeTicketsJSON(tickets);
        } else {
          // Add to JSON if not present
          tickets.push(updatedTicket);
          writeTicketsJSON(tickets);
        }
      } catch (jsonError) {
        console.warn("Failed to sync to JSON:", jsonError);
      }
    }

    // Auto-learn: If ticket is resolved with a solution, add to knowledge base
    if (status === "resolved" && solution && solution.trim().length > 10) {
      try {
        const { addSolutionToKnowledgeBase } = await import("@/lib/knowledge-base");
        const issueSummary = updatedTicket?.issue_summary || "Unknown issue";
        await addSolutionToKnowledgeBase(issueSummary, solution);
        console.log("✅ Solution auto-learned and added to knowledge base");
      } catch (learnError) {
        console.warn("Failed to auto-learn solution:", learnError);
      }
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      usingFallback,
    });
  } catch (error: any) {
    console.error("PATCH ticket error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update ticket" },
      { status: 500 }
    );
  }
}

// GET - Get single ticket
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    let ticket: any = null;
    let usingFallback = false;

    // Try Supabase first
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        ticket = data;
      } else {
        throw new Error(error?.message || "Supabase query failed");
      }
    } catch (supabaseError: any) {
      // Fallback to JSON file
      console.warn("Supabase unavailable, using tickets.json:", supabaseError?.message || supabaseError);
      usingFallback = true;
      
      const tickets = readTicketsJSON();
      ticket = tickets.find((t: any) => t.id === id || t.ticket_number === id);
      
      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ ticket, usingFallback });
  } catch (error: any) {
    console.error("GET ticket error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}
