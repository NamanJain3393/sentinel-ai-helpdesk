import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (serverClient) {
    return serverClient;
  }

  let url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  // Fix common mistake: User copied Dashboard URL instead of API URL
  if (url && url.includes("supabase.com/dashboard/project/")) {
    const projectId = url.split("project/")[1].split("/")[0];
    url = `https://${projectId}.supabase.co`;
    console.log("⚠️ Detected Dashboard URL in server env. Auto-corrected to:", url);
  }

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  serverClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return serverClient;
}

