/**
 * Detects if user message indicates dissatisfaction or unresolved issue
 * Triggers automatic ticket creation
 */

export function shouldCreateTicket(message: string, conversationHistory: any[]): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Direct dissatisfaction phrases
  const dissatisfactionPhrases = [
    "not working",
    "still not solved",
    "not satisfied",
    "doesn't work",
    "didn't help",
    "still having",
    "still experiencing",
    "no solution",
    "can't fix",
    "unable to resolve",
    "need help",
    "escalate",
    "raise ticket",
    "create ticket",
    "contact admin",
    "speak to someone",
  ];

  // Check current message
  const hasDissatisfaction = dissatisfactionPhrases.some(phrase => 
    lowerMessage.includes(phrase)
  );

  // Check conversation history for context
  const recentMessages = conversationHistory.slice(-4);
  const hasRepeatedIssues = recentMessages.filter((m: any) => 
    m.role === "user" && dissatisfactionPhrases.some(phrase => 
      m.content.toLowerCase().includes(phrase)
    )
  ).length >= 2;

  // Check for error mentions
  const errorKeywords = ["error", "crash", "broken", "failed", "issue", "problem"];
  const hasErrorMention = errorKeywords.some(keyword => 
    lowerMessage.includes(keyword) && (
      lowerMessage.includes("excel") ||
      lowerMessage.includes("printer") ||
      lowerMessage.includes("application") ||
      lowerMessage.includes("system")
    )
  );

  return hasDissatisfaction || hasRepeatedIssues || hasErrorMention;
}

export function extractIssueSummary(message: string, conversationHistory: any[]): string {
  // Try to extract the main issue from conversation
  const userMessages = conversationHistory
    .filter((m: any) => m.role === "user")
    .map((m: any) => m.content)
    .slice(-3);
  
  const allText = [...userMessages, message].join(" ");
  
  // Extract first sentence or first 200 chars
  const summary = allText.split(/[.!?]/)[0] || allText.slice(0, 200);
  return summary.trim() || message.slice(0, 200);
}

