import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { embedText, cosineSimilarity } from "@/lib/embeddings";
import { createIssue, logChatMessage } from "@/lib/db";
import { createChatCompletion, type OpenRouterMessage } from "@/lib/openrouter";

/**
 * Enhanced chatbot API that uses CSV data and OpenRouter
 */
export async function POST(req: Request) {
  try {
    const { message, conversationHistory = [] } = await req.json();
    const userMessage = typeof message === "string" ? message : message?.content;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Fetch ticket data directly from CSV
    let ticketData: any[] = [];
    try {
      const filePath = path.join(process.cwd(), "data", "Monthly_Report.csv");
      const fileContent = fs.readFileSync(filePath, "utf8");
      const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });
      ticketData = parsed.data;
    } catch (err) {
      console.warn("Could not load ticket data:", err);
    }

    // Fetch manual solutions from JSON
    let jsonSolutions: any[] = [];
    try {
      const jsonPath = path.join(process.cwd(), "data", "solutions.json");
      if (fs.existsSync(jsonPath)) {
        const jsonContent = fs.readFileSync(jsonPath, "utf8");
        jsonSolutions = JSON.parse(jsonContent);
      }
    } catch (err) {
      console.warn("Could not load solutions.json:", err);
    }

    // Semantic search over CSV using embeddings
    let context = "";
    const lowerMessage = userMessage.toLowerCase();

    // Analyze query intent and extract relevant data
    if (lowerMessage.includes("sla") || lowerMessage.includes("violation")) {
      const violations = ticketData.filter(
        (t: any) => t["Resolution SLA - Violation"]?.toLowerCase() === "yes"
      );
      const violationRate = ticketData.length > 0 ? (violations.length / ticketData.length) * 100 : 0;
      const byDept = violations.reduce((acc: any, t: any) => {
        const dept = t["Department Display name"] || "Unknown";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});

      context = `SLA Violations Summary:
- Total violations: ${violations.length} out of ${ticketData.length} tickets (${violationRate.toFixed(1)}%)
- Top departments with violations: ${Object.entries(byDept)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 5)
          .map(([dept, count]: any) => `${dept} (${count})`)
          .join(", ")}
`;
    } else if (lowerMessage.includes("resolution") || lowerMessage.includes("time")) {
      const resolutionTimes = ticketData
        .map((t: any) => Number(t["Resolution SLA In Minutes"]) || 0)
        .filter((t) => t > 0);
      const avgTime =
        resolutionTimes.length > 0
          ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
          : 0;

      context = `Resolution Time Statistics:
- Average resolution time: ${avgTime.toFixed(1)} minutes
- Total tickets analyzed: ${resolutionTimes.length}
`;
    } else if (lowerMessage.includes("department")) {
      const byDept = ticketData.reduce((acc: any, t: any) => {
        const dept = t["Department Display name"] || "Unknown";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});

      const topDepts = Object.entries(byDept)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5);

      context = `Department Statistics:
${topDepts.map(([dept, count]: any) => `- ${dept}: ${count} tickets`).join("\n")}
`;
    } else {
      // DISABLED INITIAL SEARCH: User wants AI response first, KB only on escalation
      // context = ""; 
    }

    // ========== NEW PRIORITIZED FLOW: KB -> AI -> AI RETRY -> TICKET ==========
    let showTicketButton = false;
    let kbUsed = false;
    let kbContext = "";
    let conversationState = "initial";
    let systemInstruction = "";
    let aiResponse = "";
    let needsClarification = false;

    // 1. ALWAYS SEARCH KB FIRST (Priority)
    // Unless it's a greeting or very short
    const greetingRegex = /^(hi|hii|hello|hey|helo|hola|good\s+(morning|afternoon|evening)|greetings?)[\s!.]*$/i;
    const isGreeting = greetingRegex.test(userMessage.trim());
    const isTooShort = userMessage.trim().length < 5;

    let kbResults: any[] = [];

    if (!isGreeting && !isTooShort) {
      try {
        console.log(`🔍 Searching KB for: "${userMessage}"`);
        // Simulate "Taking time to search KB" as requested for Depth/Complexity feel
        await new Promise(resolve => setTimeout(resolve, 1500));

        const { searchKnowledgeBaseWithCSV } = await import("@/lib/support-chatbot");
        kbResults = await searchKnowledgeBaseWithCSV({
          query: userMessage,
          csvTickets: ticketData,
          jsonSolutions,
        });
        console.log(`📊 KB Search Results: ${kbResults.length}`);
      } catch (err) {
        console.error("KB Search Error:", err);
      }
    }

    // 2. DETERMINE RESPONSE STRATEGY
    const historyLength = conversationHistory.length;

    if (kbResults.length > 0) {
      // STRATEGY A: KB SOLUTION FOUND (Highest Priority)
      kbUsed = true;
      conversationState = "kb_solution";
      kbContext = `I found ${kbResults.length} relevant solution(s) in the Knowledge Base:\n\n${kbResults
        .map((r, i) => `**Option ${i + 1}**:\n${r.answer}`)
        .join("\n\n")}`;

      console.log("✅ Strategy: KB Solution");

    } else {
      // STRATEGY B: NO KB MATCH -> AI FALLBACK
      if (historyLength < 2) {
        // First AI Attempt (General Knowledge)
        conversationState = "ai_attempt_1";
        console.log("🤖 Strategy: AI Solution (Attempt 1)");

      } else if (historyLength < 4) {
        // Second AI Attempt (Retry / Alternative)
        conversationState = "ai_attempt_2";
        console.log("🤖 Strategy: AI Solution (Attempt 2 - Retry)");

      } else {
        // Final Strategy: Ticket
        conversationState = "ticket_option";
        showTicketButton = true;
        console.log("🎫 Strategy: Ticket Option (Flow Exhausted)");
      }
    }

    // Explicit overrides
    const ticketIntentRegex = /\b(create|raise|submit|open)\s+(a\s+)?ticket\b|\b(human|agent|support|representative)\b/i;
    if (ticketIntentRegex.test(userMessage)) {
      showTicketButton = true;
      conversationState = "ticket_requested";
    }

    // 3. CONSTRUCT SYSTEM INSTRUCTION
    // 3. CONSTRUCT SYSTEM INSTRUCTION
    systemInstruction = `You are HelplineGPT, a support assistant.
    
Your Goal: Solve the user's issue based on the current strategy.

SOCIAL RULE: If the user message is just a greeting (e.g., "hi", "hello", "hey"), IGNORE the technical strategies below and just respond with a friendly welcome like: "Hello! I'm your Helpdesk Copilot. How can I assist you today?"

CURRENT STRATEGY: ${conversationState.toUpperCase()}

Instructions by Strategy:
- KB_SOLUTION: We have a verified solution for this issue in our company Knowledge Base. 
  - **Your Tone**: Professional, direct, and efficient.
  - **The "One-Go" Rule**: Provide the solution clearly and immediately. The user is looking for a fast fix.
  - **Data Privacy & Refinement**: **Do NOT present the KB entry verbatim.** Summarize and refine the steps to be professional and generic. 
  - **CONDRIDENTIALITY**: You MUST ensure that no personal names, specific technician contacts, internal employee IDs, or specific office locations are included in your response. Replace them with generic terms like [Contact Support] or [Local Admin] if necessary.
  - **Output Requirements**: Present a clean, numbered list of troubleshooting steps derived from the KB match. Acknowledge that this is an optimized solution from our verified database.

- AI_ATTEMPT_1: No KB match found. Provide a logical, standard troubleshooting troubleshooting guide. Acknowledge that you are analyzing general best practices.
- AI_ATTEMPT_2: The previous fix failed. Provide a more advanced or alternative recovery step.
- TICKET_OPTION: Multiple attempts have failed. Apologize and provide the ticket button.

General Rules:
- Keep formatting clean (bullet points).
- No unnecessary introductory fluff.
- If it's a KB match, say "I found a verified solution in our Knowledge Base for this issue:" and then list the steps.
`;

    const payloadMessages: OpenRouterMessage[] = [
      { role: "system", content: systemInstruction },
      ...conversationHistory.slice(-6).map((msg: any) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: String(msg.content ?? ""),
      })),
      {
        role: "user",
        content: isGreeting
          ? "[SYSTEM: User is just greeting. Say hi back.] " + userMessage
          : kbUsed
            ? `${userMessage}\n\n[SYSTEM: Potential Knowledge Base Matches found. Use these to help the user, but verify details first if needed.]\n${kbContext}`
            : context
              ? `${userMessage}\n\nContext from ticket database:\n${context}`
              : userMessage,
      },
    ];

    try {
      const completion = await createChatCompletion(payloadMessages);
      aiResponse = completion.choices?.[0]?.message?.content?.trim() || "I couldn't generate a response.";

      // Clean up unwanted formatting from AI response
      aiResponse = aiResponse
        .replace(/<s>|<\/s>/gi, '') // Remove <s> tags
        .replace(/\[BOT\]/gi, '') // Remove [BOT] tags
        .replace(/\[INST\]|\[\/INST\]/gi, '') // Remove instruction tags
        .replace(/^\s*[-*#]+\s*/gm, '') // Remove markdown bullets and headers at line start
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown
        .trim();
    } catch (err: any) {
      console.error("LLM Error:", err);

      let errorMessage = "I'm currently experiencing technical difficulties. Please try searching for your issue again.";

      if (err?.status === 429 || err?.code === 'insufficient_quota' || err?.message?.includes('quota') || err?.message?.includes('Rate limit') || err?.message?.includes('429')) {
        console.warn("⚠️ OpenRouter Rate Limit Hit (Handled gracefully)");
        errorMessage = "I'm currently experiencing high traffic. Please try searching for your issue again.";
      } else {
        console.warn("⚠️ OpenRouter API Error (Handled gracefully):", err.message);
      }

      // If KB was found but LLM failed, fallback to showing KB directly
      if (kbUsed) {
        aiResponse = "I'm having trouble connecting to my brain, but I found these potential solutions in our database:\n\n" + kbContext.replace("I found", "Found");
      } else {
        aiResponse = errorMessage;
        // Only show ticket button if user has already tried a few times
        if (conversationHistory.length >= 2) {
          showTicketButton = true;
        }
      }
    }

    // Log chat messages to Supabase (best-effort)
    try {
      await Promise.all([
        logChatMessage({ role: "user", content: userMessage }),
        logChatMessage({ role: "assistant", content: aiResponse }),
      ]);
    } catch (_) {
      // Logging failed, continue without it
    }

    // If no context and response indicates no solution, log unresolved issue
    if (!context && !kbUsed && /no existing solution/i.test(aiResponse)) {
      try {
        await createIssue({
          company: "N/A",
          model: "N/A",
          issue_type: "unresolved",
          description: userMessage,
          status: "open",
          ai_generated: false,
        });
      } catch (_) { }
    }

    // Show ticket button based on conversation state
    if (conversationState === "escalation" || (conversationState === "ai_retry" && !kbUsed)) {
      showTicketButton = true;
    }

    console.log("✅ Sending Response:", {
      replyLength: aiResponse?.length,
      kbUsed,
      conversationState
    });

    return NextResponse.json({
      reply: aiResponse,
      showTicketButton,
      kbUsed,
      conversationState,
      needsClarification,
      context: context ? "Used ticket data for context" : kbUsed ? "Knowledge base search" : "General response",
    });
  } catch (err: any) {
    console.error("❌ Chat API error:", err);
    console.error("Error stack:", err?.stack);
    console.error("Error details:", {
      message: err?.message,
      status: err?.status,
      code: err?.code,
    });

    return NextResponse.json(
      {
        reply: "I apologize, but I encountered an error. Please try again.",
        error: err?.message || "Unknown error",
        details: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
