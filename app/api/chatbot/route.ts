// app/api/chatbot/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { getChatCompletionText } from "@/lib/openrouter";

// load CSV as async
function loadCSV(): Promise<any[]> {
  const filePath = path.join(process.cwd(), "data", "Monthly_Report.csv");
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) return resolve([]);
    const rows: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (d) => rows.push(d))
      .on("end", () => resolve(rows))
      .on("error", (err) => reject(err));
  });
}

function scoreRow(query: string, row: any) {
  const q = query.toLowerCase();
  let score = 0;
  const fields = ["Description", "Pending Reason", "Problem", "Category", "Solution", "Department Display name"];
  for (const f of fields) {
    const v = (row[f] || "").toString().toLowerCase();
    if (!v) continue;
    if (v.includes(q)) score += 50;
    // token overlap
    const tokens = q.split(/\s+/).slice(0, 8);
    for (const t of tokens) if (t && v.includes(t)) score += 2;
  }
  if ((row["Solution"] || "").trim().length > 8) score += 10;
  return score;
}

// find best match
function findBest(query: string, rows: any[], minScore = 6) {
  const scored = rows.map((r) => ({ r, s: scoreRow(query, r) }));
  scored.sort((a, b) => b.s - a.s);
  const best = scored[0];
  if (!best || best.s < minScore) return null;
  return best.r;
}

// split raw solution into clean steps
function solutionToSteps(raw: string) {
  if (!raw) return [];
  // split by newlines, numbered lists, hyphens, or sentences
  const byNl = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (byNl.length >= 2) return byNl;
  // try numbered / hyphen split
  const byNum = raw.split(/\d+\.\s+/).map(s => s.trim()).filter(Boolean);
  if (byNum.length >= 2) return byNum;
  const byDash = raw.split(/-\s+/).map(s => s.trim()).filter(Boolean);
  if (byDash.length >= 2) return byDash;
  // fallback: sentence split
  const sentences = raw.match(/[^\.!\?]+[\.!\?]+/g) || [raw];
  return sentences.map(s => s.trim());
}

async function paraphraseSteps(steps: string[], query: string) {
  if (!steps.length || !process.env.OPENROUTER_API_KEY) return steps;
  try {
    const text = await getChatCompletionText([
      {
        role: "system",
        content:
          "You are a clear, concise IT support assistant. Convert troubleshooting steps into a friendly, user-facing checklist. Keep steps short, imperative, and simple.",
      },
      {
        role: "user",
        content: `User issue: "${query}".\n\nRaw steps:\n${steps
          .map((s, i) => `${i + 1}. ${s}`)
          .join("\n")}\n\nReturn only a numbered list of steps (1., 2., ...).`,
      },
    ]);
    // split returned text into lines and trim
    const out = text.split(/\r?\n/).map((s: string) => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
    return out.length ? out : steps;
  } catch (e) {
    console.error("Paraphrase error:", e);
    return steps;
  }
}

// Ticket creation (local file). For production: replace with Supabase insert.
function createTicket(issue: string, context?: any) {
  const TICKETS_PATH = path.join(process.cwd(), "data", "tickets.json");
  if (!fs.existsSync(TICKETS_PATH)) fs.writeFileSync(TICKETS_PATH, "[]");
  const tickets = JSON.parse(fs.readFileSync(TICKETS_PATH, "utf8"));
  const id = "TCKT-" + Math.random().toString(36).slice(2, 9).toUpperCase();
  const t = { id, issue, context: context || null, status: "open", createdAt: new Date().toISOString() };
  tickets.unshift(t);
  fs.writeFileSync(TICKETS_PATH, JSON.stringify(tickets, null, 2));
  return t;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = (body?.message || "").toString().trim();
    const confirmTicket = Boolean(body?.createTicket); // createTicket flag only when user confirms
    if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is missing" }, { status: 500 });
    }

    const rows = await loadCSV();
    // find best row
    const match = findBest(message, rows, 6);

    if (match && match.Solution && !confirmTicket) {
      // prepare steps
      const rawSteps = solutionToSteps(match.Solution);
      const steps = await paraphraseSteps(rawSteps, message);
      // send user-friendly steps (no raw csv fields)
      return NextResponse.json({
        source: "kb",
        steps,
        meta: { confidenceApprox: Math.min(99, scoreRow(message, match)) },
      });
    }

    // If the user explicitly asked to create ticket (confirmTicket true) OR no match found -> create ticket
    if (confirmTicket || !match) {
      const ticket = createTicket(message, { matchedRow: match ? { Description: match.Description } : null });
      return NextResponse.json({
        ticketCreated: true,
        ticketId: ticket.id,
        message: `I couldn't find a working solution. I've created ticket ${ticket.id} — admin will review it.`,
      });
    }

    return NextResponse.json({ reply: "No solution found in KB and ticket not confirmed." });
  } catch (err) {
    console.error("chatbot route err:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
