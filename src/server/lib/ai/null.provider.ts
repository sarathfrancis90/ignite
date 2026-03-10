import { type AIProvider, type EmbeddingResult, type SimilarityResult } from "./provider";

export class NullAIProvider implements AIProvider {
  readonly name = "null";

  isAvailable(): boolean {
    return false;
  }

  async generateEmbedding(_text: string): Promise<EmbeddingResult> {
    return { embedding: [], dimensions: 0 };
  }

  async findSimilar(_embedding: number[], _limit: number): Promise<SimilarityResult[]> {
    return [];
  }
}
