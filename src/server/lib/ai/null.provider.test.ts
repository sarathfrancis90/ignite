import { describe, it, expect } from "vitest";
import { NullAIProvider } from "./null.provider";

describe("NullAIProvider", () => {
  const provider = new NullAIProvider();

  it("reports as unavailable", () => {
    expect(provider.isAvailable()).toBe(false);
  });

  it("has name 'null'", () => {
    expect(provider.name).toBe("null");
  });

  it("returns empty embedding", async () => {
    const result = await provider.generateEmbedding("test text");
    expect(result.embedding).toEqual([]);
    expect(result.dimensions).toBe(0);
  });

  it("returns empty similarity results", async () => {
    const results = await provider.findSimilar([0.1, 0.2], 5);
    expect(results).toEqual([]);
  });
});
