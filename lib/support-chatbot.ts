import { getSupabaseServerClient } from "./supabase-server";
import { embedText } from "./embeddings";

export type KnowledgeBaseMatch = {
  id: string;
  question: string;
  answer: string;
  similarity: number;
};

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type TicketRecord = {
  id: string;
  ticket_number: string;
  user_email: string;
  issue_summary: string;
  chat_context: string | null;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
};

export async function createEmbedding(text: string): Promise<number[]> {
  const [embedding] = await embedText([text]);
  return embedding ?? [];
}

export async function searchKnowledgeBase({
  queryEmbedding,
  similarityThreshold = 0.8,
  matchCount = 3,
}: {
  queryEmbedding: number[];
  similarityThreshold?: number;
  matchCount?: number;
}): Promise<KnowledgeBaseMatch[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("match_knowledge_base", {
    query_embedding: queryEmbedding,
    similarity_threshold: similarityThreshold,
    match_count: matchCount,
  });

  if (error) {
    const errorMessage = error.message ||
      error.details ||
      error.hint ||
      `Supabase error (code: ${error.code || "unknown"})`;
    const supabaseError = new Error(errorMessage);
    (supabaseError as any).code = error.code;
    (supabaseError as any).details = error.details;
    (supabaseError as any).hint = error.hint;
    throw supabaseError;
  }

  const matches = (data ?? []) as KnowledgeBaseMatch[];
  console.log(`🔍 Raw KB Matches: ${matches.length}`);
  matches.forEach(m => console.log(` - [${m.similarity.toFixed(4)}] ${m.question.substring(0, 50)}...`));

  return matches;
}

export async function createTicket({
  question,
  userEmail,
  chatContext,
}: {
  question: string;
  userEmail?: string;
  chatContext?: string;
}): Promise<TicketRecord> {
  const supabase = getSupabaseServerClient();
  const ticketNumber = `TCK-${Date.now().toString().slice(-6)}`;

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      ticket_number: ticketNumber,
      user_email: userEmail ?? "unknown@user",
      issue_summary: question,
      chat_context: chatContext ?? null,
      status: "open",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as TicketRecord;
}

export async function saveAdminResponse({
  ticketId,
  responder,
  response,
}: {
  ticketId: string;
  responder?: string;
  response: string;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("ticket_responses").insert({
    ticket_id: ticketId,
    responder: responder ?? "admin",
    response,
  });

  if (error) {
    throw error;
  }
}

export async function addKnowledgeBaseEntry({
  question,
  answer,
}: {
  question: string;
  answer: string;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const embeddings = await createEmbedding(`${question}\n\n${answer}`);

  const { error } = await supabase.from("knowledge_base").insert({
    question,
    answer,
    embeddings,
  });

  if (error) {
    throw error;
  }
}

export async function updateTicketStatus({
  ticketId,
  status,
  solution,
}: {
  ticketId: string;
  status: TicketStatus;
  solution?: string;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("tickets")
    .update({
      status,
      admin_solution: solution ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    throw error;
  }
}

export async function resolveTicketWithKnowledgeBase({
  ticketId,
  responder,
  response,
  knowledgeQuestion,
  knowledgeAnswer,
}: {
  ticketId: string;
  responder?: string;
  response: string;
  knowledgeQuestion: string;
  knowledgeAnswer: string;
}): Promise<void> {
  await saveAdminResponse({ ticketId, responder, response });
  await addKnowledgeBaseEntry({
    question: knowledgeQuestion,
    answer: knowledgeAnswer,
  });
  await updateTicketStatus({ ticketId, status: "resolved" });
}

/**
 * Enhanced KB search that combines Supabase KB + CSV data with sanitization
 */
export async function searchKnowledgeBaseWithCSV({
  query,
  csvTickets,
  jsonSolutions,
}: {
  query: string;
  csvTickets?: any[];
  jsonSolutions?: any[];
}): Promise<{ source: string; question: string; answer: string; similarity?: number }[]> {
  const { sanitizeSolution, generalizeSolution, formatAsSteps } = await import("./sanitization");
  const results: { source: string; question: string; answer: string; similarity?: number }[] = [];

  // 1. Search Supabase KB (priority - recent admin-provided solutions)
  try {
    const queryEmbedding = await createEmbedding(query);
    const kbMatches = await searchKnowledgeBase({
      queryEmbedding,
      similarityThreshold: 0.6,
      matchCount: 5,
    });

    for (const match of kbMatches) {
      results.push({
        source: "knowledge_base",
        question: match.question,
        answer: formatAsSteps(generalizeSolution(match.answer)),
        similarity: match.similarity,
      });
    }
  } catch (err: any) {
    // KB search failed (possibly function doesn't exist), continue with CSV only
    console.warn("KB search failed:", err.message);
  }

  const lowerQuery = query.toLowerCase();
  const stopWords = ["not", "working", "issue", "help", "problem", "error", "failed", "fail", "doesn't", "didn't", "cant", "can't", "please", "thanks", "thank", "thankyou", "hii", "hi", "hello", "hey"];
  const keywords = lowerQuery.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));

  // If after filtering we have no real keywords (just greetings/fluff), stop search
  if (keywords.length === 0) {
    console.log("🛑 No searchable technical keywords found. Skipping DB/CSV search.");
    return [];
  }

  // 2. Search JSON Solutions if provided (High priority manual overrides)
  if (jsonSolutions && jsonSolutions.length > 0) {
    const jsonMatches = jsonSolutions
      .filter((item: any) => {
        const issue = (item.issue || "").toLowerCase();
        const solution = (item.solution || "").toLowerCase();
        const combined = `${issue} ${solution}`;

        // Stricter word-by-word matching: Require at least 60% of keywords to match
        const matchCount = keywords.filter(keyword => combined.includes(keyword)).length;
        const matchRatio = matchCount / keywords.length;
        return matchRatio >= 0.6 && matchCount > 0;
      })
      .slice(0, 5);

    for (const item of jsonMatches) {
      results.push({
        source: "json_manual",
        question: sanitizeSolution(item.issue || "Issue"),
        answer: formatAsSteps(generalizeSolution(item.solution || "No solution provided")),
        similarity: 0.95, // High confidence for manual entries
      });
    }
  }

  // 3. Search CSV tickets if provided
  if (csvTickets && csvTickets.length > 0) {
    const csvMatches = csvTickets
      .filter((ticket: any) => {
        const description = (ticket["Description"] || "").toLowerCase();
        const solution = (ticket["Solution"] || "").toLowerCase();
        const symptom = (ticket["Symptom"] || "").toLowerCase();
        const combined = `${description} ${solution} ${symptom}`;

        // Word-by-word focus: Require majority of technical keywords
        const matchCount = keywords.filter(keyword => combined.includes(keyword)).length;
        const matchRatio = matchCount / keywords.length;
        return matchRatio >= 0.6 && matchCount > 0;
      })
      .slice(0, 5);

    for (const ticket of csvMatches) {
      const solution = ticket["Solution"] || "No solution recorded";
      results.push({
        source: "csv",
        question: sanitizeSolution(ticket["Description"] || ticket["Symptom"] || "Issue"),
        answer: formatAsSteps(generalizeSolution(solution)),
        similarity: 0.8, // Lower confidence than manual entries
      });
    }
  }

  // Sort by source (KB/JSON first) and similarity
  return results.sort((a, b) => {
    // Prioritize manual JSON and KB entries over CSV
    const scoreA = (a.source === "knowledge_base" || a.source === "json_manual") ? 10 : 0;
    const scoreB = (b.source === "knowledge_base" || b.source === "json_manual") ? 10 : 0;

    if (scoreA !== scoreB) return scoreB - scoreA;
    return (b.similarity || 0) - (a.similarity || 0);
  }).slice(0, 5);
}
