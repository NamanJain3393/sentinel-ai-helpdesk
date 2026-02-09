import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  addKnowledgeBaseEntry,
  saveAdminResponse,
  updateTicketStatus,
  TicketStatus,
} from "@/lib/support-chatbot";

async function handleTicketAction(formData: FormData) {
  "use server";

  const ticketId = formData.get("ticketId")?.toString();
  const issueSummary = formData.get("issueSummary")?.toString();
  const response = formData.get("response")?.toString().trim();
  const shouldResolve = formData.get("resolve") === "true";
  const kbQuestion = formData.get("kbQuestion")?.toString().trim();
  const kbAnswer = formData.get("kbAnswer")?.toString().trim();

  if (!ticketId || !response) {
    throw new Error("Ticket ID and response are required.");
  }

  await saveAdminResponse({ ticketId, response });

  if (shouldResolve) {
    await updateTicketStatus({ ticketId, status: "resolved", solution: response });

    // Auto-add to KB if resolved, even if KB fields are empty
    // Use explicit KB fields if provided, otherwise fallback to Issue + Response
    const finalQuestion = kbQuestion || issueSummary;
    const finalAnswer = kbAnswer || response;

    if (finalQuestion && finalAnswer) {
      await addKnowledgeBaseEntry({ question: finalQuestion, answer: finalAnswer });
    }
  } else if (kbQuestion && kbAnswer) {
    // Allow adding to KB without resolving
    await addKnowledgeBaseEntry({ question: kbQuestion, answer: kbAnswer });
  }

  revalidatePath(`/admin/ticket/${ticketId}`);
  revalidatePath("/admin");
}

export const dynamic = "force-dynamic";

export default async function TicketDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = getSupabaseServerClient();
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id,ticket_number,user_email,issue_summary,conversation_history,status,admin_solution,created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching ticket:", error);
  }

  if (!ticket) {
    console.error("Ticket not found for ID:", params.id);
    notFound();
  }

  const { data: responses } = await supabase
    .from("ticket_responses")
    .select("id,responder,response,created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });

  const statusColors: Record<TicketStatus, string> = {
    open: "text-red-600",
    in_progress: "text-amber-600",
    resolved: "text-emerald-600",
    closed: "text-slate-500",
  } as const;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Ticket</p>
            <h1 className="text-3xl font-semibold text-slate-900">{ticket.ticket_number}</h1>
            <p className={`text-sm ${statusColors[ticket.status as TicketStatus]}`}>
              {ticket.status.replace("_", " ")}
            </p>
          </div>
          <a
            href="/admin"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            ← Back to admin
          </a>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">Details</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">User email</dt>
                <dd className="text-slate-900">{ticket.user_email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Issue summary</dt>
                <dd className="text-slate-900">{ticket.issue_summary}</dd>
              </div>
              {ticket.conversation_history && Array.isArray(ticket.conversation_history) && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400 mb-2">Chat History</dt>
                  <dd className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs space-y-3 max-h-64 overflow-y-auto">
                    {ticket.conversation_history.map((msg: any, i: number) => (
                      <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] uppercase text-slate-400 mb-1">{msg.role}</span>
                        <div className={`rounded-lg p-2 max-w-[90%] ${msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-white border border-slate-200 text-slate-700'}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">Responses</h2>
            <div className="mt-4 space-y-4">
              {(responses ?? []).length === 0 && (
                <p className="text-sm text-slate-500">No responses yet.</p>
              )}
              {(responses ?? []).map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{entry.responder ?? "admin"}</span>
                    <span>{new Date(entry.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-slate-800">{entry.response}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Add response</h2>
          <form action={handleTicketAction} className="mt-4 space-y-4">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="issueSummary" value={ticket.issue_summary} />
            <label className="block text-xs font-semibold text-slate-600">Response</label>
            <textarea
              name="response"
              className="h-32 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share your troubleshooting steps"
              required
            />

            <label className="block text-xs font-semibold text-slate-600">
              Add to knowledge base (optional)
            </label>
            <input
              name="kbQuestion"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Question"
            />
            <textarea
              name="kbAnswer"
              className="h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
              placeholder="Answer"
            />

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="resolve" value="true" defaultChecked={ticket.status !== "resolved"} />
                Mark ticket as resolved
              </label>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Save response
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
