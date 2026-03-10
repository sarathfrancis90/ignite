import { create } from "zustand";
import type { ComparisonStore } from "@/types/comparison";
import type { Idea } from "@/types/idea";

export const useComparisonStore = create<ComparisonStore>((set) => ({
  isActive: false,
  leftIdea: null,
  rightIdea: null,

  enterComparison: (ideaA: Idea, ideaB: Idea) =>
    set({ isActive: true, leftIdea: ideaA, rightIdea: ideaB }),

  exitComparison: () =>
    set({ isActive: false, leftIdea: null, rightIdea: null }),

  swapIdeas: () =>
    set((state) => ({
      leftIdea: state.rightIdea,
      rightIdea: state.leftIdea,
    })),

  replaceIdea: (position: "left" | "right", newIdea: Idea) =>
    set(() => {
      if (position === "left") {
        return { leftIdea: newIdea };
      }
      return { rightIdea: newIdea };
    }),

  closePanel: (position: "left" | "right") =>
    set((state) => {
      const remaining = position === "left" ? state.rightIdea : state.leftIdea;
      if (!remaining) {
        return { isActive: false, leftIdea: null, rightIdea: null };
      }
      if (position === "left") {
        return { leftIdea: null };
      }
      return { rightIdea: null };
    }),
}));
