import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userEmail, issueSummary, conversationHistory } = body;

        if (!userEmail || !issueSummary) {
            return NextResponse.json(
                { error: "User email and issue summary are required" },
                { status: 400 }
            );
        }

        // Generate ticket number
        const ticketNumber = `TKT-${Date.now()}`;

        // Create ticket using raw fetch to debug error
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing Supabase credentials");
        }

        let targetUrl = supabaseUrl;

        // Fix common mistake: User copied Dashboard URL instead of API URL
        // Input: https://supabase.com/dashboard/project/yapnivpqcfpqmhaevlwm
        // Output: https://yapnivpqcfpqmhaevlwm.supabase.co
        if (supabaseUrl.includes("supabase.com/dashboard/project/")) {
            const projectId = supabaseUrl.split("project/")[1].split("/")[0];
            targetUrl = `https://${projectId}.supabase.co`;
            console.log("⚠️ Detected Dashboard URL. Auto-corrected to:", targetUrl);
        }

        targetUrl = `${targetUrl}/rest/v1/tickets`;
        const isServiceKey = supabaseKey.startsWith("eyJ") && supabaseKey.length > 200; // Rough check

        console.log("🔍 Debugging Supabase Request:");
        console.log(" - URL:", targetUrl);
        console.log(" - Key Type:", isServiceKey ? "Service Role (Likely)" : "Anon/Public (Likely)");
        console.log(" - Key Length:", supabaseKey.length);

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            body: JSON.stringify({
                ticket_number: ticketNumber,
                user_email: userEmail,
                issue_summary: issueSummary,
                conversation_history: conversationHistory || [],
                status: "open",
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Supabase REST API Error:", response.status, response.statusText);
            console.error(" - Body:", errorText);
            console.error(" - Headers:", JSON.stringify([...response.headers.entries()]));

            return NextResponse.json(
                { error: `Supabase API Error: ${response.status} ${response.statusText}`, details: errorText },
                { status: 500 }
            );
        }

        const data = await response.json();
        const ticket = data[0];

        return NextResponse.json({
            success: true,
            ticketNumber: ticket.ticket_number,
            ticketId: ticket.id,
        });
    } catch (err) {
        console.error("Ticket creation error:", err);
        return NextResponse.json(
            { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}
