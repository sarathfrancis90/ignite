export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

export interface SimilarityResult {
  id: string;
  score: number;
}

export interface AIProvider {
  readonly name: string;

  isAvailable(): boolean;

  generateEmbedding(text: string): Promise<EmbeddingResult>;

  findSimilar(embedding: number[], limit: number): Promise<SimilarityResult[]>;
}
