const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
  }>;
  [key: string]: unknown;
};

async function fetchFromOpenRouter(payload: Record<string, unknown>): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing. Add it to your environment.");
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000", // Required for OpenRouter free tier
      "X-Title": "Support Chatbot", // Required for OpenRouter free tier
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ OpenRouter API Error [${response.status}]:`, errorText);
    throw new Error(`OpenRouter request failed: [${response.status}] ${errorText}`);
  }

  return (await response.json()) as OpenRouterResponse;
}

const FALLBACK_MODELS = [
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3n-e2b-it:free",
  "google/gemma-3n-e4b-it:free",
  "qwen/qwen3-4b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "upstage/solar-pro-3:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "arcee-ai/trinity-mini:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-nano-12b-2-vl:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "openrouter/free", // Final fallback that picks any available free model
];

export async function createChatCompletion(messages: OpenRouterMessage[]): Promise<OpenRouterResponse> {
  let lastError: any;

  for (const model of FALLBACK_MODELS) {
    try {
      console.log(`🤖 Trying model: ${model}`);

      // Handle models that don't support 'system' role (like Gemma 3)
      let finalMessages = [...messages];
      const isGemma = model.toLowerCase().includes("gemma");

      if (isGemma) {
        const systemMessage = finalMessages.find(m => m.role === "system");
        if (systemMessage) {
          // Remove system message
          const otherMessages = finalMessages.filter(m => m.role !== "system");
          // Merge it into the first user message or add it as the first message with 'user' role
          if (otherMessages.length > 0 && otherMessages[0].role === "user") {
            otherMessages[0] = {
              ...otherMessages[0],
              content: `[Instruction]\n${systemMessage.content}\n\n[User Message]\n${otherMessages[0].content}`
            };
            finalMessages = otherMessages;
          } else {
            // No user messages found, just convert system to user
            finalMessages = [
              { role: "user", content: systemMessage.content },
              ...otherMessages
            ];
          }
        }
      }

      return await fetchFromOpenRouter({
        model,
        messages: finalMessages,
        max_tokens: 1024,
      });
    } catch (err: any) {
      console.warn(`⚠️ Model ${model} failed: ${err.message}`);
      lastError = err;
      // Continue to next model
    }
  }

  // If all models fail, throw the last error
  throw lastError || new Error("All AI models failed to respond.");
}

export async function getChatCompletionText(messages: OpenRouterMessage[]): Promise<string> {
  const data = await createChatCompletion(messages);
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

