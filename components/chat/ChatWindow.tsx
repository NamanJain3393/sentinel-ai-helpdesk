"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp?: Date;
}

function ChatInput({ onSend, loading }: { onSend: (msg: string) => Promise<void>; loading: boolean }) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const send = async () => {
    if (!text.trim() || loading) return;
    const msg = text.trim();
    setText("");
    await onSend(msg);
    inputRef.current?.focus();
  };

  return (
    <div className="flex gap-2 p-4 bg-white border-t">
      <Input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Describe your issue..."
        disabled={loading}
        className="flex-1"
      />
      <Button
        onClick={send}
        disabled={loading || !text.trim()}
        className="bg-indigo-600 hover:bg-indigo-700"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hello! I'm your Helpdesk Assistant. Describe your issue and I'll help you find a solution.",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  async function handleSend(userMsg: string) {
    // Add user message
    setMessages((m) => [...m, { role: "user", text: userMsg, timestamp: new Date() }]);
    setIsTyping(true);
    setIsProcessing(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await res.json();
      setIsTyping(false);

      // Handle step-by-step solution
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        // Show description first if available
        if (data.description) {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              text: `I found a solution for: ${data.description}`,
              timestamp: new Date(),
            },
          ]);
          await new Promise((r) => setTimeout(r, 600));
        }

        // Show steps one by one with typing animation
        for (let i = 0; i < data.steps.length; i++) {
          await new Promise((r) => setTimeout(r, 800));
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              text: `Step ${i + 1}: ${data.steps[i]}`,
              timestamp: new Date(),
            },
          ]);
        }

        // Ask if resolved
        await new Promise((r) => setTimeout(r, 600));
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: "Did this solution resolve your issue? (Reply 'yes' or 'no')",
            timestamp: new Date(),
          },
        ]);
      } else if (data.ticketCreated) {
        // Ticket was created
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: data.message || `Ticket ${data.ticketId} has been created.`,
            timestamp: new Date(),
          },
        ]);
        // Show success notification
        if (typeof window !== "undefined" && (window as any).toast) {
          (window as any).toast.success(`Ticket ${data.ticketId} created successfully!`);
        }
      } else if (data.noMatch) {
        // No match found, ask if they want a ticket
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: data.reply || "I couldn't find a matching solution. Would you like me to raise a ticket? (Reply 'yes' to create ticket)",
            timestamp: new Date(),
          },
        ]);
      } else {
        // Generic response
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: data.reply || "Sorry, I couldn't find that.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      setIsProcessing(false);
    }
  }

  // Handle user responses to "Did this resolve your issue?"
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.text.includes("Did this solution resolve")
    ) {
      // Check if next user message is yes/no
      const checkResponse = () => {
        const userMessages = messages.filter((m) => m.role === "user");
        const lastUserMsg = userMessages[userMessages.length - 1];
        
        if (lastUserMsg) {
          const lower = lastUserMsg.text.toLowerCase().trim();
          const isYes = /^(yes|yep|yeah|yup|correct|fixed|resolved|solved|it works|working|done)$/i.test(lower);
          const isNo = /^(no|nope|nah|not working|still issue|still problem|didn't work|doesn't work|not fixed|not resolved)$/i.test(lower);
          
          if (isYes) {
            setMessages((m) => [
              ...m,
              {
                role: "assistant",
                text: "Great! I'm glad the solution worked for you. If you need any further assistance, feel free to ask. Have a great day! 😊",
                timestamp: new Date(),
              },
            ]);
          } else if (isNo) {
            setMessages((m) => [
              ...m,
              {
                role: "assistant",
                text: "I understand the solution didn't work. Would you like me to raise a ticket for admin review? (Reply 'yes' to create ticket)",
                timestamp: new Date(),
              },
            ]);
          }
        }
      };
      
      // Small delay to ensure message is added
      const timer = setTimeout(checkResponse, 100);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Handle ticket creation request
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.text.includes("Would you like me to raise a ticket")
    ) {
      const checkTicketRequest = () => {
        const userMessages = messages.filter((m) => m.role === "user");
        const lastUserMsg = userMessages[userMessages.length - 1];
        
        if (lastUserMsg) {
          const lower = lastUserMsg.text.toLowerCase().trim();
          const wantsTicket = /^(yes|yep|yeah|please|sure|ok|okay|create ticket|raise ticket)$/i.test(lower);
          
          if (wantsTicket) {
            // Get the original issue from conversation
            const originalIssue = messages.find((m) => m.role === "user")?.text || "User issue";
            handleSend(`create ticket for: ${originalIssue}`);
          }
        }
      };
      
      const timer = setTimeout(checkTicketRequest, 100);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Messages Area */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`inline-block max-w-[80%] p-3 rounded-2xl ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-900 shadow-sm border"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              {msg.timestamp && (
                <p className={`text-xs mt-1 ${msg.role === "user" ? "text-indigo-100" : "text-slate-500"}`}>
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              )}
            </div>
          </motion.div>
        ))}
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white p-3 rounded-2xl shadow-sm border">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSend} loading={isProcessing} />
    </div>
  );
}

