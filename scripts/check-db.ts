
import { getSupabaseClient } from "../lib/db";

async function checkDb() {
    console.log("Checking database connection...");
    try {
        const supabase = getSupabaseClient();

        // Check if we can query the table
        const { data, error } = await supabase
            .from("chat_history")
            .select("count", { count: "exact", head: true });

        if (error) {
            console.error("❌ Error querying chat_history:", error.message);
            if (error.message.includes("relation") && error.message.includes("does not exist")) {
                console.error("👉 The 'chat_history' table does not exist. Please run the SQL migration.");
            }
        } else {
            console.log("✅ Connection successful!");
            console.log(`✅ 'chat_history' table exists. Row count: ${data}`);
        }
    } catch (err: any) {
        console.error("❌ Unexpected error:", err.message);
    }
}

checkDb();
