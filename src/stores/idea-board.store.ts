import { create } from "zustand";

interface IdeaBoardState {
  selectedIdeaIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;

  splitDialogOpen: boolean;
  setSplitDialogOpen: (open: boolean) => void;
  splitTargetId: string | null;
  setSplitTarget: (ideaId: string | null) => void;

  mergeDialogOpen: boolean;
  setMergeDialogOpen: (open: boolean) => void;

  bulkActionInProgress: boolean;
  setBulkActionInProgress: (inProgress: boolean) => void;
}

export const useIdeaBoardStore = create<IdeaBoardState>((set, get) => ({
  selectedIdeaIds: new Set<string>(),

  toggleSelection: (id: string) => {
    set((state) => {
      const next = new Set(state.selectedIdeaIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIdeaIds: next };
    });
  },

  selectAll: (ids: string[]) => {
    set({ selectedIdeaIds: new Set(ids) });
  },

  clearSelection: () => {
    set({ selectedIdeaIds: new Set() });
  },

  isSelected: (id: string) => get().selectedIdeaIds.has(id),

  splitDialogOpen: false,
  setSplitDialogOpen: (open: boolean) => set({ splitDialogOpen: open }),
  splitTargetId: null,
  setSplitTarget: (ideaId: string | null) =>
    set({ splitTargetId: ideaId, splitDialogOpen: ideaId !== null }),

  mergeDialogOpen: false,
  setMergeDialogOpen: (open: boolean) => set({ mergeDialogOpen: open }),

  bulkActionInProgress: false,
  setBulkActionInProgress: (inProgress: boolean) =>
    set({ bulkActionInProgress: inProgress }),
}));
