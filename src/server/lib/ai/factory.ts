import { type AIProvider } from "./provider";
import { NullAIProvider } from "./null.provider";
import { logger } from "@/server/lib/logger";

function createProvider(): AIProvider {
  const aiEnabled = process.env.AI_ENABLED === "true";

  if (!aiEnabled) {
    logger.info("AI disabled — using NullAIProvider");
    return new NullAIProvider();
  }

  // Future: check for OPENAI_API_KEY -> OpenAIProvider
  // Future: check for local ONNX model -> LocalAIProvider
  logger.info("AI enabled but no provider configured — falling back to NullAIProvider");
  return new NullAIProvider();
}

const globalForAI = globalThis as unknown as {
  aiProvider: AIProvider | undefined;
};

export const aiProvider = globalForAI.aiProvider ?? createProvider();

if (process.env.NODE_ENV !== "production") {
  globalForAI.aiProvider = aiProvider;
}
