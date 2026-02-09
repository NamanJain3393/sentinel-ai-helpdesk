"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Trash2,
  Ticket,
  Plus,
  RotateCw,
  Moon,
  Sun,
  Menu,
  X,
  Download,
  MessageSquare,
  Settings,
  FileText,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import MessageBubble from "./MessageBubble";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  confidence?: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export default function ChatGPTInterface() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your Helpdesk Copilot. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true); // Always visible on desktop
  const [showRaiseTicket, setShowRaiseTicket] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useLocalStorage<ChatSession[]>("chat-sessions", []);
  const [currentSession, setCurrentSession] = useLocalStorage<ChatSession | null>("current-session", null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedMessagesRef = useRef<string>("");
  const currentSessionRef = useRef<ChatSession | null>(null);
  const saveSessionRef = useRef<() => void>(() => {});

  // Handle mounting to prevent SSR issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Update ref when currentSession changes
  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  // Load current session on mount (only after component is mounted)
  useEffect(() => {
    if (mounted && currentSession && currentSession.messages) {
      // Deserialize dates from localStorage (they're stored as ISO strings)
      const deserializedMessages: Message[] = currentSession.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        confidence: m.confidence,
        timestamp: m.timestamp instanceof Date 
          ? m.timestamp 
          : typeof m.timestamp === 'string' 
          ? new Date(m.timestamp) 
          : new Date(),
      }));
      setMessages(deserializedMessages);
      setCurrentSessionId(currentSession.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Save session to localStorage (with change detection to prevent infinite loops)
  const saveSession = useCallback(() => {
    if (!mounted || messages.length <= 1) return; // Don't save during SSR or if no messages
    
    // Create a stable string representation of messages for comparison
    const messagesString = JSON.stringify(messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })));
    
    // Skip if messages haven't changed
    if (messagesString === lastSavedMessagesRef.current) {
      return;
    }
    
    lastSavedMessagesRef.current = messagesString;
    
    const sessionTitle = messages.find((m) => m.role === "user")?.content.slice(0, 50) || "New Chat";
    const sessionId = currentSessionId || `session-${Date.now()}`;
    const currentSession = currentSessionRef.current;
    
    // Create session with proper date handling
    const session = {
      id: sessionId,
      title: sessionTitle,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        confidence: m.confidence,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : new Date(m.timestamp).toISOString(),
      })),
      createdAt: (currentSession?.createdAt instanceof Date 
        ? currentSession.createdAt 
        : currentSession?.createdAt 
        ? new Date(currentSession.createdAt) 
        : new Date()).toISOString(),
    };

    setCurrentSession(session as any);
    setSessions((prev) => {
      // Remove duplicates by ID first
      const uniqueSessions = prev.filter((s) => s.id !== session.id);
      // Add new session at the beginning and limit to 20
      const updated = [session as any, ...uniqueSessions].slice(0, 20);
      // Remove any remaining duplicates by ID (in case of race conditions)
      const seen = new Set<string>();
      return updated.filter((s) => {
        if (seen.has(s.id)) {
          return false;
        }
        seen.add(s.id);
        return true;
      });
    });
  }, [messages, currentSessionId, setCurrentSession, setSessions, mounted]);

  // Store latest saveSession in ref
  useEffect(() => {
    saveSessionRef.current = saveSession;
  }, [saveSession]);

  // Debounced save session (prevent infinite loops)
  useEffect(() => {
    if (!mounted || messages.length <= 1) return;
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout - use ref to avoid dependency issues
    saveTimeoutRef.current = setTimeout(() => {
      saveSessionRef.current();
    }, 1000); // Debounce by 1 second

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages.length, mounted]); // Only depend on message count and mounted state

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setShowRaiseTicket(false);
    inputRef.current?.focus();

    await handleSendMessage(input.trim(), newMessages);
  };

  const handleSendMessage = async (messageText: string, conversationContext: Message[]) => {
    if (!messageText.trim() || isStreaming) return;

    setIsStreaming(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...conversationContext
              .filter((m) => m.role === "user" || m.role === "assistant")
              .slice(-6)
              .map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: messageText.trim() },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Request failed.");
        throw new Error(errorText || "Request failed.");
      }

      const data = await response.json();
      const assistantText =
        data?.choices?.[0]?.message?.content?.trim() ??
        data?.reply ??
        "I couldn't generate a response. Please try again.";

      setCurrentSessionId((prev) => prev ?? `session-${Date.now()}`);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: assistantText,
          timestamp: new Date(),
        },
      ]);
      setShowRaiseTicket(true);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat? This action cannot be undone.")) {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: "Hello! I'm your Helpdesk Copilot. How can I assist you today?",
          timestamp: new Date(),
        },
      ]);
      setShowRaiseTicket(false);
      setInput("");
      // Keep session ID for logging purposes
      toast.success("Chat cleared successfully");
    }
  };

  const handleNewChat = () => {
    if (window.confirm("Start a new chat? This will clear all messages and reset the session.")) {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: "Hello! I'm your Helpdesk Copilot. How can I assist you today?",
          timestamp: new Date(),
        },
      ]);
      setCurrentSessionId(null);
      setShowRaiseTicket(false);
      setInput("");
      // Clear current session completely
      setCurrentSession(null);
      // Clear localStorage chat history if needed
      try {
        localStorage.removeItem("chatHistory");
      } catch (e) {
        // Ignore localStorage errors
      }
      toast.success("New chat started");
    }
  };

  const handleRaiseTicket = async () => {
    const recentMessages = messages.slice(-5).map((m) => `${m.role}: ${m.content}`).join("\n");
    const userIssue = messages.find((m) => m.role === "user")?.content || "Issue from chat";

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: "user@example.com",
          issue_summary: userIssue,
          chat_context: recentMessages,
          session_id: currentSessionId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Ticket #${data.ticket.ticket_number} created!`, {
          description: "Our admin will review it soon.",
          duration: 5000,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `✅ Your ticket has been created successfully (#${data.ticket.ticket_number}). Our admin will review it soon.`,
            timestamp: new Date(),
          },
        ]);
        setShowRaiseTicket(false);
      }
    } catch (error) {
      console.error("Failed to create ticket:", error);
      toast.error("Failed to create ticket. Please try again.");
    }
  };

  const handleExportChat = () => {
    const chatText = messages
      .map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`)
      .join("\n\n");
    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported successfully");
  };

  const handleSelectSession = (session: ChatSession) => {
    // Deserialize dates when loading session
    const deserializedMessages: Message[] = session.messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      confidence: m.confidence,
      timestamp: m.timestamp instanceof Date 
        ? m.timestamp 
        : typeof m.timestamp === 'string' 
        ? new Date(m.timestamp) 
        : new Date(),
    }));
    setMessages(deserializedMessages);
    setCurrentSessionId(session.id);
    setCurrentSession(session);
    // Keep sidebar visible
  };

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="flex h-screen bg-white dark:bg-slate-900 overflow-hidden items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 overflow-hidden">
      {/* Sidebar - Always visible on desktop, toggleable on mobile */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`${showSidebar ? "flex" : "hidden"} md:flex w-80 border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 flex-col fixed md:relative h-full z-10`}
      >
        <div className="flex-1 overflow-y-auto p-2 min-h-0 pb-32">
          {sessions.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No chat history yet
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 group"
                >
                  <MessageSquare className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate flex-1">{session.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fixed bottom button container - always visible */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 bg-white dark:bg-slate-950 z-20">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              // Navigate to ticket history
              window.location.href = "/admin";
            }}
          >
            <Ticket className="h-4 w-4 mr-2" />
            Ticket History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleExportChat}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Chat
          </Button>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - ChatGPT-style - Always Visible */}
        <div className="border-b-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-md z-50 relative">
          <div className="flex items-center justify-between gap-2 min-w-0">
            {/* Left side - Bot title */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden flex-shrink-0"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                  <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    Support Assistant
                  </h1>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                    <span>Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Action buttons - ALWAYS VISIBLE */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                onClick={handleNewChat}
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md flex-shrink-0"
                title="New Chat"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Chat
              </Button>
              <Button 
                onClick={handleClearChat}
                className="h-8 px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 text-xs font-semibold shadow-sm flex-shrink-0"
                title="Clear Chat"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                disabled={!mounted}
                title="Toggle theme"
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 bg-white dark:bg-slate-950">
          <div className="mx-auto max-w-3xl space-y-6">
            <AnimatePresence>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Positioned higher to avoid taskbar collision */}
        <div className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 pt-3 pb-12 flex-shrink-0">
          <div className="mx-auto max-w-3xl">
            {showRaiseTicket && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2 flex items-center gap-2"
              >
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRaiseTicket}
                  className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md transition-all"
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  Raise Ticket
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRaiseTicket(false)}
                >
                  Dismiss
                </Button>
              </motion.div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type your message..."
                  rows={1}
                  className="min-h-[44px] max-h-[200px] resize-none pr-12 text-[15px] leading-relaxed rounded-xl border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-100 shadow-sm"
                  disabled={isStreaming}
                />
                <div className="absolute right-2 bottom-2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    title="Attachment (Coming soon)"
                    disabled
                  >
                    📎
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                size="lg"
                className="h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
                title={isStreaming ? "Sending…" : "Send message"}
              >
                {isStreaming ? (
                  <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

