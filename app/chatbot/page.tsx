"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const API_ROUTE = "/api/chat";

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [ticketCreated, setTicketCreated] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track API response metadata
  const [showTicketButton, setShowTicketButton] = useState(false);
  const [conversationState, setConversationState] = useState<string>("initial");
  const [needsClarification, setNeedsClarification] = useState(false);

  const [historyLog, setHistoryLog] = useState<ChatMessage[]>([]);
  const [conversationSessions, setConversationSessions] = useState<{ id: string; firstMessage: string; messages: ChatMessage[] }[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const canSend = input.trim().length > 0 && !isStreaming;

  // Load conversation sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      try {
        const sessions = JSON.parse(savedSessions);
        // Deduplicate sessions by ID (remove duplicates)
        const uniqueSessions = sessions.reduce((acc: any[], session: any) => {
          if (!acc.find(s => s.id === session.id)) {
            acc.push(session);
          }
          return acc;
        }, []);
        setConversationSessions(uniqueSessions);

        // Save deduplicated sessions back
        if (uniqueSessions.length !== sessions.length) {
          localStorage.setItem('chatSessions', JSON.stringify(uniqueSessions));
        }
      } catch (err) {
        console.error('Failed to load chat sessions:', err);
        // Clear corrupted data
        localStorage.removeItem('chatSessions');
      }
    }
  }, []);

  // Save conversation sessions to localStorage whenever they change
  useEffect(() => {
    if (conversationSessions.length > 0) {
      // Deduplicate before saving
      const uniqueSessions = conversationSessions.reduce((acc: any[], session: any) => {
        if (!acc.find(s => s.id === session.id)) {
          acc.push(session);
        }
        return acc;
      }, []);
      localStorage.setItem('chatSessions', JSON.stringify(uniqueSessions));
    }
  }, [conversationSessions]);

  // Fetch history on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/chat/history");
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(data.messages);
            setHistoryLog(data.messages); // Initialize history log
          }
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    }
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    setError(null);
    setInput("");
    setTicketCreated(null);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID?.() ?? `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID?.() ?? `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setHistoryLog((prev) => [...prev, userMessage]); // Add to history log

    // Create new session if this is the first message
    if (messages.length === 0 && !currentSessionId) {
      // Use crypto.randomUUID for guaranteed uniqueness, with better fallback
      const newSessionId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setCurrentSessionId(newSessionId);
    }

    setIsStreaming(true);

    try {
      const response = await fetch(API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = await response.json();
      console.log("API Response:", data);
      const assistantText =
        data?.choices?.[0]?.message?.content?.trim() ??
        data?.reply ??
        "I couldn't generate a response. Please try again.";

      console.log("Assistant text:", assistantText);

      // Update conversation state from API response
      if (data?.conversationState) {
        setConversationState(data.conversationState);
      }
      if (data?.needsClarification !== undefined) {
        setNeedsClarification(data.needsClarification);
      }
      if (data?.showTicketButton) {
        setShowTicketButton(true);
      }

      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === assistantMessage.id ? { ...msg, content: assistantText } : msg
        );

        // Update session with complete conversation
        if (currentSessionId) {
          setConversationSessions(prevSessions => {
            const sessionExists = prevSessions.some(s => s.id === currentSessionId);
            if (sessionExists) {
              return prevSessions.map(s => s.id === currentSessionId
                ? { ...s, messages: updated }
                : s
              );
            } else {
              // Add new session to the list
              const firstUserMessage = updated.find(m => m.role === "user")?.content || "New conversation";
              return [
                { id: currentSessionId, firstMessage: firstUserMessage, messages: updated },
                ...prevSessions
              ].slice(0, 20); // Limit to last 20 sessions
            }
          });
        }

        return updated;
      });
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to send message. Please try again.";
      setError(errorMessage);
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id));
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleCreateTicket() {
    if (!userEmail.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!issueDescription.trim()) {
      setError("Please describe your issue");
      return;
    }

    try {
      const response = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: userEmail.trim(),
          issueSummary: issueDescription.trim(),
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create ticket");
      }

      const data = await response.json();
      setTicketCreated(data.ticketNumber);
      setShowTicketDialog(false);
      setShowTicketButton(false);
      setUserEmail("");
      setIssueDescription("");
    } catch (err) {
      console.error("Ticket creation error:", err);
      setError("Failed to create ticket. Please try again.");
    }
  }

  function handleNewChat() {
    // Save current conversation to sessions if it has messages
    if (messages.length > 0 && currentSessionId) {
      const firstUserMessage = messages.find(m => m.role === "user")?.content || "New conversation";

      // Check if session already exists to prevent duplicates
      setConversationSessions(prev => {
        const sessionExists = prev.some(s => s.id === currentSessionId);
        if (sessionExists) {
          // Update existing session
          return prev.map(s => s.id === currentSessionId
            ? { ...s, messages: [...messages] }
            : s
          );
        } else {
          // Add new session
          return [
            { id: currentSessionId, firstMessage: firstUserMessage, messages: [...messages] },
            ...prev.slice(0, 9)
          ];
        }
      });
    }

    // Clear the view but keep the history log
    setMessages([]);
    setInput("");
    setError(null);
    setShowTicketButton(false);
    setTicketCreated(null);
    setUserEmail("");
    setIssueDescription("");
    setCurrentSessionId(null);
  }

  function loadConversation(sessionId: string) {
    const session = conversationSessions.find(s => s.id === sessionId);
    if (session) {
      // Save current conversation before switching
      if (messages.length > 0 && currentSessionId && currentSessionId !== sessionId) {
        const firstUserMessage = messages.find(m => m.role === "user")?.content || "New conversation";
        setConversationSessions(prev =>
          prev.map(s => s.id === currentSessionId
            ? { ...s, messages: [...messages] }
            : s
          )
        );
      }

      setMessages(session.messages);
      setCurrentSessionId(sessionId);
      setError(null);
      setShowTicketButton(false);
      setTicketCreated(null);
    }
  }

  // Derive history items from the persistent history log
  const historyItems = historyLog.filter(m => m.role === "user").slice(-10).reverse();

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-700"
          >
            + New Chat
          </button>
        </div>

        <div className="flex-1 px-4 py-2 overflow-y-auto">
          <div className="text-xs text-gray-400 mb-2">Recent Conversations</div>
          {conversationSessions.length === 0 ? (
            <div className="text-sm text-gray-500 italic">No previous chats</div>
          ) : (
            <div className="space-y-2">
              {conversationSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => loadConversation(session.id)}
                  className={`text-sm p-2 rounded-lg cursor-pointer transition-colors ${currentSessionId === session.id
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  title={session.firstMessage}
                >
                  <div className="truncate">{session.firstMessage}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {session.messages.length} messages
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Messages Container */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <h2 className="text-2xl font-semibold mb-2">HelplineGPT</h2>
                  <p className="text-sm ">Ask for help with any IT issue</p>
                </div>
              </div>
            )}

            {/* Conversation State Indicator */}
            {isStreaming && conversationState !== "initial" && (
              <div className="flex justify-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700">
                  {conversationState === "clarifying" && "🔍 Analyzing your issue..."}
                  {conversationState === "kb_searched" && "📚 Searching knowledge base..."}
                  {conversationState === "ai_retry" && "🤔 Trying alternative solutions..."}
                  {conversationState === "escalation" && "⚠️ Complex issue detected..."}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3 ${message.role === "user"
                    ? "bg-black text-white"
                    : "bg-white text-gray-800 shadow-sm border border-gray-200"
                    }`}
                >
                  <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
                    {message.content || (message.role === "assistant" && isStreaming ? "..." : "")}
                  </div>
                </div>
              </div>
            ))}

            {/* Ticket Created Confirmation */}
            {ticketCreated && (
              <div className="flex justify-center">
                <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 max-w-md">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-green-900">Ticket Created</p>
                      <p className="text-sm text-green-700 mt-1">
                        Your ticket <span className="font-mono font-semibold">{ticketCreated}</span> has been created. Our team will review it shortly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Ticket Button (appears between messages and input) */}
        {showTicketButton && !ticketCreated && (
          <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-900">Still having issues?</p>
                <p className="text-xs text-amber-700">Create a ticket for our support team</p>
              </div>
              <button
                onClick={() => setShowTicketDialog(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                Create Ticket
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-start gap-3 text-sm text-red-800">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">Error</p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t bg-white px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message HelplineGPT..."
                disabled={isStreaming}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed text-[15px]"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Ticket Creation Dialog */}
      {showTicketDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Support Ticket</h3>
            <p className="text-sm text-gray-600 mb-4">
              Our support team will review your issue and respond via email.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Email *
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="you@example.com"
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Please enter a valid email address</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Description *
                </label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Please describe the issue you're facing in detail..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Provide as much detail as possible to help us resolve your issue faster</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowTicketDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTicket}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
