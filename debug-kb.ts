import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

// Fix dashboard URL if present
let url = supabaseUrl;
if (url.includes("supabase.com/dashboard/project/")) {
    const projectId = url.split("project/")[1].split("/")[0];
    url = `https://${projectId}.supabase.co`;
}

const supabase = createClient(url, supabaseKey);

async function checkKB() {
    console.log("🔍 Checking Knowledge Base...");

    const { data, error } = await supabase
        .from("knowledge_base")
        .select("id, question, answer, created_at");

    if (error) {
        console.error("❌ Error fetching KB:", error);
        return;
    }

    console.log(`✅ Found ${data.length} entries:`);
    data.forEach((entry) => {
        console.log(`- [${entry.created_at}] Q: ${entry.question}`);
        console.log(`  A: ${entry.answer.substring(0, 50)}...`);
    });
}

checkKB();
