import { create } from "zustand";

interface BucketStore {
  activeBucketId: string | null;
  setActiveBucket: (id: string | null) => void;

  isCreateDialogOpen: boolean;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;

  editingBucketId: string | null;
  setEditingBucket: (id: string | null) => void;

  isSmartMode: boolean;
  toggleSmartMode: () => void;
  setSmartMode: (val: boolean) => void;
}

export const useBucketStore = create<BucketStore>((set) => ({
  activeBucketId: null,
  setActiveBucket: (id) => set({ activeBucketId: id }),

  isCreateDialogOpen: false,
  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () =>
    set({ isCreateDialogOpen: false, isSmartMode: false }),

  editingBucketId: null,
  setEditingBucket: (id) => set({ editingBucketId: id }),

  isSmartMode: false,
  toggleSmartMode: () => set((s) => ({ isSmartMode: !s.isSmartMode })),
  setSmartMode: (val) => set({ isSmartMode: val }),
}));
