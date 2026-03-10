"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, Save, Plus, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StepSettingsData, VotingCriterion } from "@/types/campaign-wizard";

interface StepSettingsProps {
  campaign: {
    id: string;
    hasQualificationPhase: boolean;
    hasVoting: boolean;
    votingCriteria: unknown;
    graduationVisitors: number;
    graduationCommenters: number;
    graduationVoters: number;
    graduationVotingLevel: number;
    graduationDaysInStatus: number;
    isConfidentialAllowed: boolean;
    isShowOnStartPage: boolean;
  };
  onSave: (data: StepSettingsData) => void;
  isSaving: boolean;
  onBack: () => void;
  onDone: () => void;
}

function parseVotingCriteria(raw: unknown): VotingCriterion[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is VotingCriterion =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).id === "string" &&
      typeof (item as Record<string, unknown>).label === "string",
  );
}

export function StepSettings({ campaign, onSave, isSaving, onBack, onDone }: StepSettingsProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<StepSettingsData>({
    defaultValues: {
      hasQualificationPhase: campaign.hasQualificationPhase,
      hasVoting: campaign.hasVoting,
      votingCriteria: parseVotingCriteria(campaign.votingCriteria),
      graduationVisitors: campaign.graduationVisitors,
      graduationCommenters: campaign.graduationCommenters,
      graduationVoters: campaign.graduationVoters,
      graduationVotingLevel: campaign.graduationVotingLevel,
      graduationDaysInStatus: campaign.graduationDaysInStatus,
      isConfidentialAllowed: campaign.isConfidentialAllowed,
      isShowOnStartPage: campaign.isShowOnStartPage,
    },
  });

  const hasVoting = watch("hasVoting");
  const votingCriteria = watch("votingCriteria");
  const hasQualificationPhase = watch("hasQualificationPhase");

  const addCriterion = () => {
    const newCriterion: VotingCriterion = {
      id: crypto.randomUUID(),
      label: "",
      weight: 1,
    };
    setValue("votingCriteria", [...votingCriteria, newCriterion], { shouldDirty: true });
  };

  const removeCriterion = (id: string) => {
    setValue(
      "votingCriteria",
      votingCriteria.filter((c) => c.id !== id),
      { shouldDirty: true },
    );
  };

  const updateCriterion = (id: string, field: keyof VotingCriterion, value: string | number) => {
    setValue(
      "votingCriteria",
      votingCriteria.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
      { shouldDirty: true },
    );
  };

  const onSubmit = (data: StepSettingsData) => {
    onSave(data);
  };

  const handleSaveAndFinish = () => {
    handleSubmit((data) => {
      onSave(data);
      onDone();
    })();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-semibold text-gray-900">Campaign Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure qualification, voting, graduation thresholds, and visibility.
        </p>
      </div>

      {/* Qualification Phase Toggle */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={hasQualificationPhase}
            onClick={() =>
              setValue("hasQualificationPhase", !hasQualificationPhase, { shouldDirty: true })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              hasQualificationPhase ? "bg-primary-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                hasQualificationPhase ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <Label>Enable Qualification Phase</Label>
        </div>
        <p className="text-xs text-gray-500">
          Ideas must pass community thresholds before advancing to evaluation.
        </p>
      </div>

      {/* Voting Configuration */}
      <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={hasVoting}
            onClick={() => setValue("hasVoting", !hasVoting, { shouldDirty: true })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              hasVoting ? "bg-primary-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                hasVoting ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <legend className="text-sm font-medium text-gray-900">Enable Voting</legend>
        </div>

        {hasVoting && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Voting Criteria</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCriterion}>
                <Plus className="mr-1 h-4 w-4" />
                Add Criterion
              </Button>
            </div>

            {votingCriteria.length === 0 && (
              <p className="text-sm text-gray-400">
                No voting criteria defined. Add criteria to enable structured voting.
              </p>
            )}

            {votingCriteria.map((criterion) => (
              <div
                key={criterion.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <Input
                  value={criterion.label}
                  onChange={(e) => updateCriterion(criterion.id, "label", e.target.value)}
                  placeholder="Criterion label (e.g., Feasibility)"
                  className="flex-1"
                  maxLength={200}
                />
                <div className="flex items-center gap-1">
                  <Label className="whitespace-nowrap text-xs text-gray-500">Weight:</Label>
                  <Input
                    type="number"
                    value={criterion.weight}
                    onChange={(e) =>
                      updateCriterion(criterion.id, "weight", Number(e.target.value))
                    }
                    className="w-20"
                    min={0}
                    max={100}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCriterion(criterion.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <p className="text-xs text-gray-400">Vote scale: 1-5 stars per criterion</p>
          </div>
        )}
      </fieldset>

      {/* Community Graduation Thresholds */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-900">
          Community Graduation Thresholds
        </legend>
        <p className="text-xs text-gray-500">
          Minimum thresholds an idea must reach before it can graduate from community discussion.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="graduationVisitors">Min. Visitors</Label>
            <Input
              id="graduationVisitors"
              type="number"
              {...register("graduationVisitors", { valueAsNumber: true })}
              min={0}
            />
            {errors.graduationVisitors && (
              <p className="text-sm text-red-600">{errors.graduationVisitors.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="graduationCommenters">Min. Commenters</Label>
            <Input
              id="graduationCommenters"
              type="number"
              {...register("graduationCommenters", { valueAsNumber: true })}
              min={0}
            />
            {errors.graduationCommenters && (
              <p className="text-sm text-red-600">{errors.graduationCommenters.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="graduationVoters">Min. Voters</Label>
            <Input
              id="graduationVoters"
              type="number"
              {...register("graduationVoters", { valueAsNumber: true })}
              min={0}
            />
            {errors.graduationVoters && (
              <p className="text-sm text-red-600">{errors.graduationVoters.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="graduationVotingLevel">Avg. Voting Level</Label>
            <Input
              id="graduationVotingLevel"
              type="number"
              step="0.1"
              {...register("graduationVotingLevel", { valueAsNumber: true })}
              min={0}
            />
            {errors.graduationVotingLevel && (
              <p className="text-sm text-red-600">{errors.graduationVotingLevel.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="graduationDaysInStatus">Min. Days in Status</Label>
            <Input
              id="graduationDaysInStatus"
              type="number"
              {...register("graduationDaysInStatus", { valueAsNumber: true })}
              min={0}
            />
            {errors.graduationDaysInStatus && (
              <p className="text-sm text-red-600">{errors.graduationDaysInStatus.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Visibility & Privacy */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-900">Visibility & Privacy</legend>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={watch("isConfidentialAllowed")}
            onClick={() =>
              setValue("isConfidentialAllowed", !watch("isConfidentialAllowed"), {
                shouldDirty: true,
              })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              watch("isConfidentialAllowed") ? "bg-primary-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                watch("isConfidentialAllowed") ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <Label>Allow Confidential Ideas</Label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={watch("isShowOnStartPage")}
            onClick={() =>
              setValue("isShowOnStartPage", !watch("isShowOnStartPage"), {
                shouldDirty: true,
              })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              watch("isShowOnStartPage") ? "bg-primary-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                watch("isShowOnStartPage") ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <Label>Show on Start Page</Label>
        </div>
      </fieldset>

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
          <Button type="submit" variant="outline" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" onClick={handleSaveAndFinish} disabled={isSaving}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Save & Finish
          </Button>
        </div>
      </div>
    </form>
  );
}
