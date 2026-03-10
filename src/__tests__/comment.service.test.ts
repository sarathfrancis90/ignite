import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { extractMentions } from "@/server/services/comment.service";

describe("extractMentions", () => {
  it("should extract user IDs from mention syntax", () => {
    const content = "Hey @[John Doe](user123) check this out!";
    const mentions = extractMentions(content);
    expect(mentions).toEqual(["user123"]);
  });

  it("should extract multiple mentions", () => {
    const content = "@[Alice](user1) and @[Bob](user2) please review this";
    const mentions = extractMentions(content);
    expect(mentions).toEqual(["user1", "user2"]);
  });

  it("should deduplicate mentions", () => {
    const content = "@[Alice](user1) and @[Alice](user1) again";
    const mentions = extractMentions(content);
    expect(mentions).toEqual(["user1"]);
  });

  it("should return empty array when no mentions", () => {
    const content = "This is a regular comment with no mentions";
    const mentions = extractMentions(content);
    expect(mentions).toEqual([]);
  });

  it("should handle @ symbol without mention syntax", () => {
    const content = "Email me at user@example.com";
    const mentions = extractMentions(content);
    expect(mentions).toEqual([]);
  });

  it("should handle mentions with display names containing spaces", () => {
    const content = "Hey @[Jane Marie Smith](user456)!";
    const mentions = extractMentions(content);
    expect(mentions).toEqual(["user456"]);
  });
});
