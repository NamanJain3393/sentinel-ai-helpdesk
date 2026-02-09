import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Client-side Supabase client (for use in React components)
export function getSupabaseClientClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables");
  }

  return createClient(url, key);
}

// Server-side Supabase client (DEPRECATED - use lib/db.ts instead)
// Kept for backward compatibility only
export function getSupabaseClient(): SupabaseClient {
  console.warn("⚠️ Using deprecated getSupabaseClient() from lib/supabase.ts. Use lib/db.ts instead.");
  
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase configuration. Use SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for server operations.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Database types
export interface ChatSession {
  id: string;
  user_id?: string;
  user_email?: string;
  started_at: string;
  resolved?: boolean;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  user_email: string;
  issue_summary: string;
  chat_context: string;
  created_at: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  assigned_to?: string;
  solution?: string;
  updated_at: string;
}

export interface Solution {
  id: string;
  question: string;
  solution: string;
  confidence?: number;
  created_at: string;
  updated_at?: string;
}

