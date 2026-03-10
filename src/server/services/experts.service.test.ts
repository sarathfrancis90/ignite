import { describe, expect, it, vi } from "vitest";
import { getSuggestedExperts, type ExpertsDeps } from "./experts.service";

function makeDeps(overrides: Partial<ExpertsDeps> = {}): ExpertsDeps {
  return {
    getIdeaTags: vi.fn().mockResolvedValue(["AI", "Machine Learning"]),
    findUsersBySkills: vi.fn().mockResolvedValue([
      {
        id: "user-1",
        firstName: "Jane",
        lastName: "Expert",
        displayName: "Jane Expert",
        avatarUrl: null,
        skills: ["AI", "Python", "Machine Learning"],
      },
      {
        id: "user-2",
        firstName: "Bob",
        lastName: "Specialist",
        displayName: null,
        avatarUrl: null,
        skills: ["AI", "Data Science"],
      },
    ]),
    ...overrides,
  };
}

describe("getSuggestedExperts", () => {
  it("returns experts with matching skills", async () => {
    const deps = makeDeps();
    const result = await getSuggestedExperts(
      "idea-1",
      "contributor-1",
      5,
      deps,
    );

    expect(result).toHaveLength(2);
    expect(result[0].matchingSkills).toContain("AI");
    expect(result[0].matchingSkills).toContain("Machine Learning");
    expect(result[1].matchingSkills).toContain("AI");
    expect(result[1].matchingSkills).not.toContain("Data Science");
  });

  it("returns empty array when idea has no tags", async () => {
    const deps = makeDeps({
      getIdeaTags: vi.fn().mockResolvedValue([]),
    });

    const result = await getSuggestedExperts(
      "idea-1",
      "contributor-1",
      5,
      deps,
    );
    expect(result).toHaveLength(0);
    expect(deps.findUsersBySkills).not.toHaveBeenCalled();
  });

  it("excludes the contributor from results", async () => {
    const deps = makeDeps();
    await getSuggestedExperts("idea-1", "contributor-1", 5, deps);

    expect(deps.findUsersBySkills).toHaveBeenCalledWith(
      ["AI", "Machine Learning"],
      "contributor-1",
      5,
    );
  });

  it("handles case-insensitive skill matching", async () => {
    const deps = makeDeps({
      getIdeaTags: vi.fn().mockResolvedValue(["ai"]),
      findUsersBySkills: vi.fn().mockResolvedValue([
        {
          id: "user-1",
          firstName: "Jane",
          lastName: "Expert",
          displayName: null,
          avatarUrl: null,
          skills: ["AI"],
        },
      ]),
    });

    const result = await getSuggestedExperts(
      "idea-1",
      "contributor-1",
      5,
      deps,
    );
    expect(result[0].matchingSkills).toContain("AI");
  });
});
