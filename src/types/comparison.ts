import type { Idea } from "./idea";

export interface ComparisonSlot {
  idea: Idea;
  position: "left" | "right";
}

export interface ComparisonState {
  isActive: boolean;
  leftIdea: Idea | null;
  rightIdea: Idea | null;
}

export interface ComparisonActions {
  enterComparison: (ideaA: Idea, ideaB: Idea) => void;
  exitComparison: () => void;
  swapIdeas: () => void;
  replaceIdea: (position: "left" | "right", newIdea: Idea) => void;
  closePanel: (position: "left" | "right") => void;
}

export type ComparisonStore = ComparisonState & ComparisonActions;
