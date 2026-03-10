"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Save, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPicker, type PickedUser } from "@/components/shared/UserPicker";
import type { StepIdeaCoachData, IdeaCategory } from "@/types/campaign-wizard";

interface StepIdeaCoachProps {
  campaign: {
    id: string;
    hasIdeaCoach: boolean;
    coachAssignmentMode: string;
    ideaCategories: unknown;
    settings: unknown;
  };
  coaches: PickedUser[];
  onSave: (data: StepIdeaCoachData, coachUsers: PickedUser[]) => void;
  isSaving: boolean;
  onBack: () => void;
  onNext: () => void;
}

function parseCategories(raw: unknown): IdeaCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is { id: string; name: string; coachId?: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === "string" &&
        typeof (item as Record<string, unknown>).name === "string",
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      coachId: item.coachId,
    }));
}

export function StepIdeaCoach({
  campaign,
  coaches: initialCoaches,
  onSave,
  isSaving,
  onBack,
  onNext,
}: StepIdeaCoachProps) {
  const [hasIdeaCoach, setHasIdeaCoach] = React.useState(campaign.hasIdeaCoach);
  const [assignmentMode, setAssignmentMode] = React.useState<"GLOBAL" | "PER_CATEGORY">(
    campaign.coachAssignmentMode === "PER_CATEGORY" ? "PER_CATEGORY" : "GLOBAL",
  );
  const [globalCoach, setGlobalCoach] = React.useState<PickedUser | null>(
    initialCoaches.length > 0 && campaign.coachAssignmentMode !== "PER_CATEGORY"
      ? (initialCoaches[0] ?? null)
      : null,
  );
  const [categories, setCategories] = React.useState<IdeaCategory[]>(() =>
    parseCategories(campaign.ideaCategories),
  );
  const [categoryCoaches, setCategoryCoaches] = React.useState<Record<string, PickedUser>>(() => {
    const map: Record<string, PickedUser> = {};
    if (campaign.coachAssignmentMode === "PER_CATEGORY") {
      for (const cat of parseCategories(campaign.ideaCategories)) {
        if (cat.coachId) {
          const coach = initialCoaches.find((c) => c.id === cat.coachId);
          if (coach) map[cat.id] = coach;
        }
      }
    }
    return map;
  });
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [isDirty, setIsDirty] = React.useState(false);

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCategories((prev) => [...prev, { id: crypto.randomUUID(), name }]);
    setNewCategoryName("");
    setIsDirty(true);
  };

  const removeCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setCategoryCoaches((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
    setIsDirty(true);
  };

  const renameCategory = (categoryId: string, name: string) => {
    setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, name } : c)));
    setIsDirty(true);
  };

  const buildSaveData = (): { data: StepIdeaCoachData; coachUsers: PickedUser[] } => {
    const categoriesWithCoaches = categories.map((cat) => ({
      ...cat,
      coachId: categoryCoaches[cat.id]?.id,
    }));

    const allCoaches: PickedUser[] = [];
    if (hasIdeaCoach) {
      if (assignmentMode === "GLOBAL" && globalCoach) {
        allCoaches.push(globalCoach);
      } else if (assignmentMode === "PER_CATEGORY") {
        for (const coach of Object.values(categoryCoaches)) {
          if (!allCoaches.some((c) => c.id === coach.id)) {
            allCoaches.push(coach);
          }
        }
      }
    }

    return {
      data: {
        hasIdeaCoach,
        coachAssignmentMode: assignmentMode,
        globalCoachId: assignmentMode === "GLOBAL" ? globalCoach?.id : undefined,
        categories: categoriesWithCoaches,
      },
      coachUsers: allCoaches,
    };
  };

  const handleSave = () => {
    const { data, coachUsers } = buildSaveData();
    onSave(data, coachUsers);
    setIsDirty(false);
  };

  const handleNext = () => {
    if (isDirty) {
      handleSave();
    }
    onNext();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-semibold text-gray-900">Idea Coach</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure idea coaching to help submitters refine their ideas.
        </p>
      </div>

      {/* Toggle Idea Coach */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={hasIdeaCoach}
          onClick={() => {
            setHasIdeaCoach(!hasIdeaCoach);
            setIsDirty(true);
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            hasIdeaCoach ? "bg-primary-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              hasIdeaCoach ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <Label className="cursor-pointer" onClick={() => setHasIdeaCoach(!hasIdeaCoach)}>
          Enable Idea Coach
        </Label>
      </div>

      {hasIdeaCoach && (
        <>
          {/* Assignment Mode */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-gray-900">Assignment Mode</legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="assignmentMode"
                  checked={assignmentMode === "GLOBAL"}
                  onChange={() => {
                    setAssignmentMode("GLOBAL");
                    setIsDirty(true);
                  }}
                  className="h-4 w-4 text-primary-600"
                />
                Global (one coach for all ideas)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="assignmentMode"
                  checked={assignmentMode === "PER_CATEGORY"}
                  onChange={() => {
                    setAssignmentMode("PER_CATEGORY");
                    setIsDirty(true);
                  }}
                  className="h-4 w-4 text-primary-600"
                />
                Per Category
              </label>
            </div>
          </fieldset>

          {/* Global Coach Picker */}
          {assignmentMode === "GLOBAL" && (
            <UserPicker
              label="Idea Coach"
              selectedUsers={globalCoach ? [globalCoach] : []}
              onAdd={(user) => {
                setGlobalCoach(user);
                setIsDirty(true);
              }}
              onRemove={() => {
                setGlobalCoach(null);
                setIsDirty(true);
              }}
              maxUsers={1}
              placeholder="Search for a coach..."
            />
          )}

          {/* Category Builder */}
          {assignmentMode === "PER_CATEGORY" && (
            <div className="space-y-4">
              <div>
                <Label>Idea Categories</Label>
                <p className="text-xs text-gray-500">
                  Define categories and assign a coach to each one.
                </p>
              </div>

              {/* Add Category */}
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                  placeholder="New category name..."
                  maxLength={200}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCategory}
                  disabled={!newCategoryName.trim()}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>

              {/* Category List */}
              {categories.length === 0 && (
                <p className="text-sm text-gray-400">No categories yet. Add one above.</p>
              )}

              {categories.map((cat) => (
                <div key={cat.id} className="space-y-3 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={cat.name}
                      onChange={(e) => renameCategory(cat.id, e.target.value)}
                      className="flex-1"
                      maxLength={200}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCategory(cat.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <UserPicker
                    label="Category Coach"
                    selectedUsers={categoryCoaches[cat.id] ? [categoryCoaches[cat.id]] : []}
                    onAdd={(user) => {
                      setCategoryCoaches((prev) => ({ ...prev, [cat.id]: user }));
                      setIsDirty(true);
                    }}
                    onRemove={() => {
                      setCategoryCoaches((prev) => {
                        const next = { ...prev };
                        delete next[cat.id];
                        return next;
                      });
                      setIsDirty(true);
                    }}
                    maxUsers={1}
                    placeholder="Assign a coach..."
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400">
            {isDirty ? "You have unsaved changes" : "All changes saved"}
          </p>
          <Button type="button" variant="outline" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" onClick={handleNext}>
            Next: Community
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
