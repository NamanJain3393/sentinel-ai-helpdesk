"use client";

import { motion } from "framer-motion";
import { Plus, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatSidebarProps {
  sessions: any[];
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onClose: () => void;
}

export default function ChatSidebar({
  sessions,
  onNewChat,
  onSelectSession,
  onClose,
}: ChatSidebarProps) {
  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      exit={{ x: -300 }}
      className="w-64 border-r border-slate-200 bg-white"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Chat History</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={onNewChat}
            className="mt-3 w-full"
            variant="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No chat history yet
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  <span className="truncate">
                    {new Date(session.started_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

