"use client";

import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    confidence?: number;
  };
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} group`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%] md:max-w-[75%]`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm transition-all ${
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md"
              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md"
          }`}
        >
          {message.confidence && !isUser && (
            <div className="mb-2 text-xs font-medium text-green-600 dark:text-green-400">
              ✅ {message.confidence}% confidence match
            </div>
          )}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {isUser ? (
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed m-0">{message.content}</p>
            ) : (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-[15px] leading-relaxed m-0 mb-2 last:mb-0">{children}</p>,
                  code: ({ node, ...props }) => (
                    <code
                      className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-sm font-mono"
                      {...props}
                    />
                  ),
                  pre: ({ node, ...props }) => (
                    <pre
                      className="overflow-x-auto rounded-lg bg-slate-200 dark:bg-slate-700 p-3 text-sm my-2"
                      {...props}
                    />
                  ),
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                  li: ({ children }) => <li className="text-[15px] leading-relaxed">{children}</li>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
        <span className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </motion.div>
  );
}

