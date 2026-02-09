# Quick Fix for Ticket Button

The ticket button isn't appearing because the file was reverted. Here's what needs to be added:

## The Problem
Your chat API currently doesn't have the multi-tier logic, so it never sends `showTicketButton: true` to the UI.

## The Solution

**Replace lines 228-238 in `/app/api/chat/route.ts`** with this:

```typescript
    const completion = await createChatCompletion(payloadMessages);

    const aiResponse =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I couldn't generate a response. Please try again.";

    // 🔥 MULTI-TIER SUPPORT LOGIC - START
    let showTicketButton = false;
    let kbUsed = false;
   let kbContext = "";

    // Detect if user needs KB search (says "doesn't help", "not working", etc.)
    const needsKBSearch = /doesn'?t help|not working|still not|didn'?t work|no help/i.test(userMessage);

    if (needsKBSearch && conversationHistory.length > 0) {
      console.log("🔍 KB search trigger detected");
      try {
        const { searchKnowledgeBaseWithCSV } = await import("@/lib/support-chatbot");
        const kbResults = await searchKnowledgeBaseWithCSV({
          query: userMessage,
          csvTickets: ticketData,
        });

        if (kbResults.length > 0) {
          kbUsed = true;
          kbContext = `I found ${kbResults.length} solutions in our knowledge base:\n\n${kbResults.map((r, i) => `**Solution ${i+1}**:\n${r.answer}`).join("\n\n")}`;
        } else {
          // No KB match - show ticket button
          console.log("🎫 No KB results - showing ticket button");
          showTicketButton = true;
        }
      } catch (err) {
        console.error("KB search error:", err);
        showTicketButton = true;
      }
    }

    // Also show after 2+ exchanges without resolution
    if (!kbUsed && conversationHistory.length >= 2) {
      showTicketButton = true;
    }
    // 🔥 MULTI-TIER SUPPORT LOGIC - END

    // Log chat messages to Supabase (best-effort)
    try {
      await Promise.all([
        logChatMessage({ role: "user", content: userMessage }),
        logChatMessage({ role: "assistant", content: kbUsed ? kbContext : aiResponse }),
      ]);
    } catch (_) {
      // Logging failed, continue without it
    }

    return NextResponse.json({
      reply: kbUsed ? kbContext : aiResponse,
      showTicketButton,  // 👈 THIS IS THE KEY - sends button state to UI
      kbUsed,
      context: context ? "Used ticket data for context" : kbUsed ? "Knowledge base search" : "General response",        });
```

## To Apply

1. Open `/app/api/chat/route.ts`
2. Find the `createChatCompletion` call (around line 214)
3. Replace the section with the code above
4. Save and restart dev server

The ticket button will now appear when:
- User says "doesn't help" or similar phrases
- After 2+ messages without resolution

Try it!
