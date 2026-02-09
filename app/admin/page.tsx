import Link from "next/link";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

import { getSupabaseServerClient } from "@/lib/supabase-server";
import { addKnowledgeBaseEntry } from "@/lib/support-chatbot";

interface TicketRow {
  id: string;
  ticket_number: string;
  user_email: string;
  issue_summary: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
}

interface KnowledgeBaseRow {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

async function addKnowledgeBase(formData: FormData) {
  "use server";

  const question = formData.get("question")?.toString().trim();
  const answer = formData.get("answer")?.toString().trim();

  if (!question || !answer) {
    throw new Error("Question and answer are required.");
  }

  await addKnowledgeBaseEntry({ question, answer });
  revalidatePath("/admin");
}

export default async function AdminPage() {
  const supabase = getSupabaseServerClient();

  const [{ data: tickets }, { data: knowledgeBase }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id,ticket_number,user_email,issue_summary,status,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("knowledge_base")
      .select("id,question,answer,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const ticketRows = (tickets as TicketRow[] | null) ?? [];
  const knowledgeBaseRows = (knowledgeBase as KnowledgeBaseRow[] | null) ?? [];

  console.log("🔍 Admin Dashboard Debug:");
  console.log(" - Total Tickets Fetched:", ticketRows.length);
  console.log(" - Ticket Statuses:", ticketRows.map(t => t.status));

  const openTickets = ticketRows.filter(
    (ticket) => ticket.status === "open" || ticket.status === "in_progress",
  );
  const resolvedTickets = ticketRows.filter((ticket) => ticket.status === "resolved");

  console.log(" - Open Tickets:", openTickets.length);
  console.log(" - Resolved Tickets:", resolvedTickets.length);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-slate-500">Operations</p>
          <h1 className="text-3xl font-semibold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Review tickets, add solutions, and keep the knowledge base fresh.</p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Open Tickets</h2>
              <span className="text-sm text-slate-500">{openTickets.length}</span>
            </div>
            <div className="mt-4 space-y-4">
              {openTickets.length === 0 && (
                <p className="text-sm text-slate-500">All caught up!</p>
              )}
              {openTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/ticket/${ticket.id}`}
                  className="block rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{ticket.ticket_number}</span>
                    <span className="text-xs uppercase text-amber-600">{ticket.status.replace("_", " ")}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{ticket.user_email}</p>
                  <p className="mt-1 text-slate-800">{ticket.issue_summary}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Resolved Tickets</h2>
              <span className="text-sm text-slate-500">{resolvedTickets.length}</span>
            </div>
            <div className="mt-4 space-y-4">
              {resolvedTickets.length === 0 && (
                <p className="text-sm text-slate-500">No resolved tickets yet.</p>
              )}
              {resolvedTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{ticket.ticket_number}</span>
                    <span className="text-xs uppercase">Resolved</span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-700">{ticket.user_email}</p>
                  <p className="mt-1">{ticket.issue_summary}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Knowledge Base</h2>
            <span className="text-sm text-slate-500">{knowledgeBaseRows.length} entries</span>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <form action={addKnowledgeBase} className="space-y-3 rounded-xl border bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-700">Add new entry</h3>
              <label className="block text-xs font-medium text-slate-600">Question</label>
              <textarea
                name="question"
                className="h-24 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the issue or question"
                required
              />
              <label className="block text-xs font-medium text-slate-600">Answer</label>
              <textarea
                name="answer"
                className="h-32 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provide the resolution steps"
                required
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Save to knowledge base
              </button>
            </form>

            <div className="space-y-4">
              {knowledgeBaseRows.length === 0 && (
                <p className="text-sm text-slate-500">No entries yet. Add your first solution.</p>
              )}
              {knowledgeBaseRows.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-100 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{entry.question}</p>
                  <p className="mt-2 text-sm text-slate-600">{entry.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
