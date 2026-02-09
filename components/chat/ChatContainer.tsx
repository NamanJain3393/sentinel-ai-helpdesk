"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, Ticket, Plus, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import MessageBubble from "./MessageBubble";
import ChatSidebar from "./ChatSidebar";
import LoaderDots from "./LoaderDots";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  confidence?: number;
}

export default function ChatContainer() {
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showRaiseTicket, setShowRaiseTicket] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load chat sessions
    fetch("/api/chat_history")
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(console.error);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      const messageText = input.trim();
      setInput("");
      setShowRaiseTicket(false);
      // Use updated messages for context
      setTimeout(() => handleSendMessage(messageText, updated), 0);
      return updated;
    });
  };

  const handleClear = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Chat cleared. How can I help you?",
        timestamp: new Date(),
      },
    ]);
    setCurrentSessionId(null);
    setShowRaiseTicket(false);
    toast.info("Chat cleared");
  };

  const handleRegenerate = async () => {
    // Find last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (!lastUserMessage) return;

    // Remove last assistant message if present and regenerate
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages[newMessages.length - 1]?.role === "assistant") {
        newMessages.pop();
      }
      // Use updated messages for context
      setTimeout(() => handleSendMessage(lastUserMessage.content, newMessages), 100);
      return newMessages;
    });
  };

  const handleSendMessage = async (messageText: string, conversationContext?: Message[]) => {
    if (!messageText.trim() || isStreaming) return;

    setIsStreaming(true);
    setShowRaiseTicket(false);

    const contextMessages = conversationContext || messages;
    const payloadHistory = contextMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const body = JSON.stringify({
      messages: [
        ...payloadHistory,
        {
          role: "user",
          content: messageText.trim(),
        },
      ],
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
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

  const handleRaiseTicket = async () => {
    const recentMessages = messages.slice(-5).map((m) => `${m.role}: ${m.content}`).join("\n");

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: "user@example.com", // Replace with actual user email
          issue_summary: messages[messages.length - 2]?.content || "Issue from chat",
          chat_context: recentMessages,
          session_id: currentSessionId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Ticket created!`, {
          description: `Ticket #${data.ticket.ticket_number} has been raised.`,
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
    }
  };

  const handleNewChat = () => {
    handleClear();
    setCurrentSessionId(null);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <ChatSidebar
            sessions={sessions}
            onNewChat={handleNewChat}
            onSelectSession={(sessionId) => {
              // Load session messages
              fetch(`/api/chat_history?session_id=${sessionId}`)
                .then((r) => r.json())
                .then((data) => {
                  setMessages(
                    data.messages.map((m: any) => ({
                      id: m.id,
                      role: m.role,
                      content: m.content,
                      timestamp: new Date(m.created_at),
                    }))
                  );
                });
            }}
            onClose={() => setShowSidebar(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!showSidebar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <h1 className="text-lg font-semibold text-slate-900">Helpdesk Copilot</h1>
            </div>
            <div className="flex gap-2">
              {!isStreaming && messages.length > 1 && messages[messages.length - 1]?.role === "assistant" && (
                <Button variant="outline" size="sm" onClick={handleRegenerate}>
                  <RotateCw className="h-4 w-4 mr-1" />
                  Regenerate
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </AnimatePresence>
            {isStreaming && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 shadow-sm">
                  <LoaderDots status={messages.length < 3 ? "Searching Knowledge Base..." : "Analyzing..."} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 bg-white/80 backdrop-blur-sm p-4">
          <div className="mx-auto max-w-3xl">
            {showRaiseTicket && (
              <div className="mb-3 flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRaiseTicket}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Ticket className="h-4 w-4 mr-1" />
                  Raise Ticket
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRaiseTicket(false)}
                >
                  Dismiss
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message..."
                rows={2}
                className="flex-1 resize-none"
                disabled={isStreaming}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                size="lg"
                className="shrink-0"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

