"use client";

import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

type ChatRole = "user" | "assistant";

type ChatMessageProps = {
    role: ChatRole;
    content: string;
    isStreaming?: boolean;
    timestamp?: number;
};

export function ChatMessage({ role, content, isStreaming, timestamp }: ChatMessageProps) {
    const isAssistant = role === "assistant";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`flex w-full mb-6 ${role === "user" ? "justify-end" : "justify-start"}`}
        >
            <div className={`flex max-w-[85%] sm:max-w-[75%] ${role === "user" ? "flex-row-reverse" : "flex-row"} gap-3`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isAssistant ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                    }`}>
                    {isAssistant ? <Bot size={18} /> : <User size={18} />}
                </div>

                {/* Message Content */}
                <div className={`flex flex-col ${role === "user" ? "items-end" : "items-start"}`}>
                    <div
                        className={`px-4 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed transition-all ${role === "user"
                                ? "bg-slate-900 text-white rounded-tr-none"
                                : "bg-white border border-gray-100 text-slate-800 rounded-tl-none"
                            }`}
                    >
                        {isAssistant ? (
                            <div className="prose prose-slate prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200">
                                <ReactMarkdown>
                                    {content || (isStreaming ? "..." : "")}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <p className="whitespace-pre-wrap">{content}</p>
                        )}
                    </div>

                    {/* Timestamp */}
                    {timestamp && (
                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                            {format(timestamp, "h:mm a")}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export function TypingIndicator() {
    return (
        <div className="flex justify-start mb-6">
            <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                    <Bot size={18} />
                </div>
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                    <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                    />
                    <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                    />
                    <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                    />
                </div>
            </div>
        </div>
    );
}
