let embeddingPipeline: any = null;
let TransformersModule: any = null;

async function getEmbeddingPipeline(): Promise<any> {
  if (!embeddingPipeline) {
    try {
      // Dynamically import to prevent top-level native binary loading crash
      if (!TransformersModule) {
        console.log("📦 Loading Transformers module...");
        TransformersModule = await import("@xenova/transformers");

        // Disable native onnxruntime-node as it causes dlopen errors
        TransformersModule.env.allowLocalModels = true;
        TransformersModule.env.useBrowserCache = false;
        if (typeof window === "undefined") {
          (TransformersModule.env as any).backends.onnx.node = false;
          (TransformersModule.env as any).backends.onnx.wasm.numThreads = 1;
        }
      }

      console.log("⚙️ Initializing Pipeline (WASM Mode)...");
      embeddingPipeline = await TransformersModule.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    } catch (err) {
      console.error("⚠️ Embeddings Initialization Failed:", err);
      return null;
    }
  }
  return embeddingPipeline;
}

export async function embedText(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];

  try {
    const extractor = await getEmbeddingPipeline();
    if (!extractor) {
      // Fallback: Return empty/zero vectors instead of crashing
      return texts.map(() => new Array(384).fill(0));
    }

    const embeddings: number[][] = [];
    for (const text of texts) {
      const output = await extractor(text, { pooling: "mean", normalize: true });
      const vector = Array.isArray(output?.data) ? output.data : Array.from(output.data);
      embeddings.push(vector as number[]);
    }
    return embeddings;
  } catch (err) {
    console.warn("⚠️ Embedding execution failed, falling back to empty vectors:", err);
    return texts.map(() => new Array(384).fill(0));
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}


