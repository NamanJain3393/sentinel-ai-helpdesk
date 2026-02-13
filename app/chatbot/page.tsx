"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Plus,
  MessageSquare,
  AlertCircle,
  LifeBuoy,
  Loader2,
  Trash2,
  MoreVertical
} from "lucide-react";
import { ChatMessage, TypingIndicator } from "@/components/chat/ChatMessage";

type ChatRole = "user" | "assistant";

type ChatMessageData = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp?: number;
};

type Session = {
  id: string;
  firstMessage: string;
  messages: ChatMessageData[];
};

const API_ROUTE = "/api/chat";

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
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

  const [historyLog, setHistoryLog] = useState<ChatMessageData[]>([]);
  const [conversationSessions, setConversationSessions] = useState<Session[]>([]);
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
      const uniqueSessions = conversationSessions.reduce((acc: Session[], session: Session) => {
        if (!acc.find((s: Session) => s.id === session.id)) {
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
            const formattedMessages = data.messages.map((m: any) => ({
              ...m,
              timestamp: m.timestamp || Date.now()
            }));
            setMessages(formattedMessages);
            setHistoryLog(formattedMessages);
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
  }, [messages, isStreaming]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    setError(null);
    setInput("");
    setTicketCreated(null);

    const userMessage: ChatMessageData = {
      id: crypto.randomUUID?.() ?? `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now()
    };

    const assistantMessagePlaceholder: ChatMessageData = {
      id: crypto.randomUUID?.() ?? `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: Date.now()
    };

    setMessages((prev: ChatMessageData[]) => [...prev, userMessage, assistantMessagePlaceholder]);
    setHistoryLog((prev: ChatMessageData[]) => [...prev, userMessage]);

    // Create new session if this is the first message
    if (messages.length === 0 && !currentSessionId) {
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
      const assistantText =
        data?.choices?.[0]?.message?.content?.trim() ??
        data?.reply ??
        "I couldn't generate a response. Please try again.";

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

      setMessages((prev: ChatMessageData[]) => {
        const updated = prev.map((msg: ChatMessageData) =>
          msg.id === assistantMessagePlaceholder.id ? { ...msg, content: assistantText } : msg
        );

        // Update session with complete conversation
        if (currentSessionId) {
          setConversationSessions((prevSessions: Session[]) => {
            const sessionExists = prevSessions.some((s: Session) => s.id === currentSessionId);
            if (sessionExists) {
              return prevSessions.map((s: Session) => s.id === currentSessionId
                ? { ...s, messages: updated }
                : s
              );
            } else {
              const firstUserMessage = updated.find((m: ChatMessageData) => m.role === "user")?.content || "New conversation";
              return [
                { id: currentSessionId, firstMessage: firstUserMessage, messages: updated },
                ...prevSessions
              ].slice(0, 20);
            }
          });
        }

        return updated;
      });
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to send message. Please try again.";
      setError(errorMessage);
      setMessages((prev: ChatMessageData[]) => prev.filter((msg: ChatMessageData) => msg.id !== assistantMessagePlaceholder.id));
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
          conversationHistory: messages.map((m: ChatMessageData) => ({ role: m.role, content: m.content })),
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
    if (messages.length > 0 && currentSessionId) {
      const firstUserMessage = messages.find((m: ChatMessageData) => m.role === "user")?.content || "New conversation";
      setConversationSessions((prev: Session[]) => {
        const sessionExists = prev.some((s: Session) => s.id === currentSessionId);
        if (sessionExists) {
          return prev.map((s: Session) => s.id === currentSessionId
            ? { ...s, messages: [...messages] }
            : s
          );
        } else {
          return [
            { id: currentSessionId, firstMessage: firstUserMessage, messages: [...messages] },
            ...prev.slice(0, 19)
          ];
        }
      });
    }

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
      if (messages.length > 0 && currentSessionId && currentSessionId !== sessionId) {
        setConversationSessions((prev: Session[]) =>
          prev.map((s: Session) => s.id === currentSessionId
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

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-slate-100 flex flex-col shadow-xl z-20 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 cursor-default">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
              <LifeBuoy className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">HelplineGPT</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold font-mono">Support Intelligence</p>
            </div>
          </div>

          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] rounded-xl text-sm font-semibold transition-all border border-slate-700/50 shadow-sm"
          >
            <Plus size={18} />
            New Conversation
          </button>
        </div>

        <div className="flex-1 px-3 py-2 overflow-y-auto custom-scrollbar">
          <div className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">Recent History</div>
          {conversationSessions.length === 0 ? (
            <div className="px-3 text-sm text-slate-500 italic mt-4 flex flex-col items-center gap-2">
              <MessageSquare size={24} className="opacity-20" />
              <span>No historical chats</span>
            </div>
          ) : (
            <div className="space-y-1">
              {conversationSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => loadConversation(session.id)}
                  className={`w-full text-left p-3 rounded-xl cursor-pointer transition-all flex items-start gap-3 group relative ${currentSessionId === session.id
                    ? 'bg-blue-600 shadow-lg shadow-blue-900/20'
                    : 'hover:bg-slate-800/50'
                    }`}
                  title={session.firstMessage}
                >
                  <MessageSquare size={16} className={`mt-0.5 flex-shrink-0 ${currentSessionId === session.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <div className="flex-1 overflow-hidden">
                    <div className={`text-[13px] font-medium truncate ${currentSessionId === session.id ? 'text-white' : 'text-slate-300'}`}>
                      {session.firstMessage}
                    </div>
                    <div className={`text-[10px] font-medium ${currentSessionId === session.id ? 'text-blue-100' : 'text-slate-500'}`}>
                      {session.messages.length} messages
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-300">NJ</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-200">Naman Jain</p>
              <p className="text-[10px] text-slate-500 truncate">Pro Plan</p>
            </div>
            <button className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-800">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header (Mobile specific or just context) */}
        <header className="h-16 border-b bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">System Active</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-slate-500 hover:text-slate-800 transition-colors">
              <LifeBuoy size={20} />
            </button>
          </div>
        </header>

        {/* Messages Container */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-mesh px-4 py-8 custom-scrollbar scroll-smooth"
        >
          <div className="max-w-3xl mx-auto pb-24">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center h-[60vh] text-center"
                >
                  <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mb-6">
                    <LifeBuoy size={40} className="text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">How can I help you today?</h2>
                  <p className="text-slate-500 max-w-sm mb-8">Ask me about technical issues, software installations, or general IT inquiries.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                    {[
                      "How do I reset my password?",
                      "My laptop is running slow",
                      "VPN connection issues",
                      "How to install Microsoft 365"
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(suggestion)}
                        className="p-4 text-left text-sm bg-white border border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/30 transition-all text-slate-600 font-medium"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    isStreaming={isStreaming && message.id === messages[messages.length - 1].id}
                    timestamp={message.timestamp}
                  />
                ))
              )}

              {isStreaming && (
                <TypingIndicator key="typing-indicator" />
              )}
            </AnimatePresence>

            {/* Conversation State Indicator */}
            {isStreaming && conversationState !== "initial" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center mb-6"
              >
                <div className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-full px-6 py-2 text-[12px] font-semibold text-slate-600 shadow-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-blue-600" />
                  {conversationState === "clarifying" && "Analyzing your issue..."}
                  {conversationState === "kb_searched" && "Searching knowledge base..."}
                  {conversationState === "ai_retry" && "Trying alternative solutions..."}
                  {conversationState === "escalation" && "Complex issue detected..."}
                </div>
              </motion.div>
            )}

            {/* Ticket Created Confirmation */}
            {ticketCreated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center mb-6"
              >
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-5 max-w-md shadow-lg shadow-emerald-500/5">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-500 rounded-full p-1 mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900 text-base">Support Ticket Logged</p>
                      <p className="text-sm text-emerald-700/80 mt-1 leading-relaxed">
                        Your ticket <span className="font-mono font-bold text-emerald-900 bg-emerald-200/50 px-1.5 py-0.5 rounded tracking-tighter">#{ticketCreated}</span> has been successfully created.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input Area Overlay Shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none z-10" />

        {/* Input Area */}
        <div className="px-6 py-6 bg-transparent relative z-20">
          <div className="max-w-3xl mx-auto relative">

            {/* Action Bar (Ticket Button) */}
            {showTicketButton && !ticketCreated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-16 left-0 right-0"
              >
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xl shadow-amber-900/10 flex items-center justify-between backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500 p-2 rounded-lg text-white">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">Still seeking answers?</p>
                      <p className="text-[11px] text-amber-700">A human agent can assist you further.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTicketDialog(true)}
                    className="px-5 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-amber-600/20"
                  >
                    Raise Support Ticket
                  </button>
                </div>
              </motion.div>
            )}

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm"
                >
                  <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-[13px] text-red-800 font-medium">{error}</div>
                  <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-900">
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Input Field */}
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute inset-x-0 bottom-0 bg-white/40 blur-2xl h-12 -z-10 transition-all group-focus-within:bg-blue-500/10" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here..."
                disabled={isStreaming}
                className="w-full pl-6 pr-14 py-5 rounded-[24px] border border-slate-200 bg-white shadow-2xl shadow-slate-200/80 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed text-[15px] font-medium transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-[18px] flex items-center justify-center bg-slate-900 text-white disabled:bg-slate-200 disabled:text-slate-400 hover:bg-slate-800 transition-all active:scale-90 shadow-lg shadow-slate-900/10"
              >
                {isStreaming ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </form>

            <p className="text-center text-[11px] text-slate-400 mt-4 font-medium">
              HelplineGPT may provide inaccurate info. Check important information.
            </p>
          </div>
        </div>
      </main>

      {/* Ticket Creation Dialog */}
      <AnimatePresence>
        {showTicketDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTicketDialog(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full relative z-10 overflow-hidden flex flex-col"
            >
              <div className="p-8 pb-4">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                  <LifeBuoy size={32} />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Open Support Request</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed font-medium">
                  We'll route your conversation history to a specialist for review.
                </p>
              </div>

              <div className="p-8 pt-4 space-y-6">
                <div>
                  <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Resolution Contact (Email)
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Case Summary
                  </label>
                  <textarea
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Briefly describe what still needs resolution..."
                    rows={4}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900 resize-none"
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowTicketDialog(false)}
                    className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all font-bold text-sm active:scale-95"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleCreateTicket}
                    className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold text-sm active:scale-95 shadow-xl shadow-blue-600/20"
                  >
                    Submit Support Ticket
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
