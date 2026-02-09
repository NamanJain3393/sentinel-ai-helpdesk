import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { addKnowledgeBaseEntry, updateTicketStatus } from "@/lib/support-chatbot";

/**
 * Admin ticket resolution endpoint with automatic KB saving
 */
export async function POST(req: Request) {
    try {
        const { ticketId, solution, addToKB = true } = await req.json();

        if (!ticketId || !solution) {
            return NextResponse.json(
                { error: "ticketId and solution are required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseServerClient();

        // 1. Fetch the ticket to get the issue summary
        const { data: ticket, error: fetchError } = await supabase
            .from("tickets")
            .select("issue_summary, user_email")
            .eq("id", ticketId)
            .single();

        if (fetchError || !ticket) {
            console.error("Failed to fetch ticket:", fetchError);
            return NextResponse.json(
                { error: "Ticket not found", details: fetchError?.message },
                { status: 404 }
            );
        }

        // 2. Update ticket status to resolved
        try {
            await updateTicketStatus({
                ticketId,
                status: "resolved",
                solution,
            });
        } catch (err: any) {
            console.error("Failed to update ticket status:", err);
            return NextResponse.json(
                { error: "Failed to update ticket", details: err.message },
                { status: 500 }
            );
        }

        // 3. Optionally add to knowledge base
        let kbSaved = false;
        let kbError = null;

        if (addToKB) {
            try {
                await addKnowledgeBaseEntry({
                    question: ticket.issue_summary,
                    answer: solution,
                });
                kbSaved = true;
                console.log(`✅ Solution saved to KB for ticket ${ticketId}`);
            } catch (err: any) {
                console.error("Failed to save to KB (non-critical):", err);
                kbError = err.message;
                // Don't fail the entire request if KB save fails
            }
        }

        return NextResponse.json({
            success: true,
            ticketId,
            kbSaved,
            kbError,
            message: kbSaved
                ? "Ticket resolved and solution added to knowledge base"
                : "Ticket resolved (KB save skipped or failed)",
        });
    } catch (err: any) {
        console.error("❌ Ticket resolution error:", err);
        return NextResponse.json(
            {
                error: "Failed to resolve ticket",
                details: err.message,
            },
            { status: 500 }
        );
    }
}
