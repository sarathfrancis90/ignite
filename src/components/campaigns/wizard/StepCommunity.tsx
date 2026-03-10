"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Save, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserPicker, type PickedUser } from "@/components/shared/UserPicker";
import type { StepCommunityData } from "@/types/campaign-wizard";

interface CampaignMemberData {
  userId: string;
  role: string;
  user: PickedUser;
}

interface StepCommunityProps {
  campaign: {
    id: string;
    audienceType: string;
  };
  members: CampaignMemberData[];
  onSave: (data: StepCommunityData, membersByRole: Record<string, PickedUser[]>) => void;
  isSaving: boolean;
  onBack: () => void;
  onNext: () => void;
}

function getMembersByRole(members: CampaignMemberData[], role: string): PickedUser[] {
  return members.filter((m) => m.role === role).map((m) => m.user);
}

export function StepCommunity({
  campaign,
  members,
  onSave,
  isSaving,
  onBack,
  onNext,
}: StepCommunityProps) {
  const [moderators, setModerators] = React.useState<PickedUser[]>(() =>
    getMembersByRole(members, "CAMPAIGN_MODERATOR"),
  );
  const [evaluators, setEvaluators] = React.useState<PickedUser[]>(() =>
    getMembersByRole(members, "CAMPAIGN_EVALUATOR"),
  );
  const [seeders, setSeeders] = React.useState<PickedUser[]>(() =>
    getMembersByRole(members, "CAMPAIGN_SEEDER"),
  );
  const [audienceType, setAudienceType] = React.useState<"ALL_INTERNAL" | "SELECTED_INTERNAL">(
    campaign.audienceType === "SELECTED_INTERNAL" ? "SELECTED_INTERNAL" : "ALL_INTERNAL",
  );
  const [isDirty, setIsDirty] = React.useState(false);

  const totalInvitees =
    audienceType === "ALL_INTERNAL"
      ? "All internal users"
      : `${moderators.length + evaluators.length + seeders.length} selected members`;

  const buildSaveData = (): {
    data: StepCommunityData;
    membersByRole: Record<string, PickedUser[]>;
  } => ({
    data: {
      moderatorIds: moderators.map((u) => u.id),
      evaluatorIds: evaluators.map((u) => u.id),
      seederIds: seeders.map((u) => u.id),
      audienceType,
    },
    membersByRole: {
      CAMPAIGN_MODERATOR: moderators,
      CAMPAIGN_EVALUATOR: evaluators,
      CAMPAIGN_SEEDER: seeders,
    },
  });

  const handleSave = () => {
    const { data, membersByRole } = buildSaveData();
    onSave(data, membersByRole);
    setIsDirty(false);
  };

  const handleNext = () => {
    if (isDirty) {
      handleSave();
    }
    onNext();
  };

  const addUser = (
    setter: React.Dispatch<React.SetStateAction<PickedUser[]>>,
    user: PickedUser,
  ) => {
    setter((prev) => [...prev, user]);
    setIsDirty(true);
  };

  const removeUser = (
    setter: React.Dispatch<React.SetStateAction<PickedUser[]>>,
    userId: string,
  ) => {
    setter((prev) => prev.filter((u) => u.id !== userId));
    setIsDirty(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-semibold text-gray-900">Community</h2>
        <p className="mt-1 text-sm text-gray-500">
          Assign campaign team members and configure the target audience.
        </p>
      </div>

      {/* Moderators */}
      <UserPicker
        label="Moderators"
        selectedUsers={moderators}
        onAdd={(user) => addUser(setModerators, user)}
        onRemove={(userId) => removeUser(setModerators, userId)}
        placeholder="Search for moderators..."
      />

      {/* Evaluation Team */}
      <UserPicker
        label="Evaluation Team"
        selectedUsers={evaluators}
        onAdd={(user) => addUser(setEvaluators, user)}
        onRemove={(userId) => removeUser(setEvaluators, userId)}
        placeholder="Search for evaluators..."
      />

      {/* Seeding Team */}
      <UserPicker
        label="Seeding Team"
        selectedUsers={seeders}
        onAdd={(user) => addUser(setSeeders, user)}
        onRemove={(userId) => removeUser(setSeeders, userId)}
        placeholder="Search for seeders..."
      />

      {/* Target Audience */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-900">Target Audience</legend>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="audienceType"
              checked={audienceType === "ALL_INTERNAL"}
              onChange={() => {
                setAudienceType("ALL_INTERNAL");
                setIsDirty(true);
              }}
              className="h-4 w-4 text-primary-600"
            />
            All internal users
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="audienceType"
              checked={audienceType === "SELECTED_INTERNAL"}
              onChange={() => {
                setAudienceType("SELECTED_INTERNAL");
                setIsDirty(true);
              }}
              className="h-4 w-4 text-primary-600"
            />
            Selected users only (org units, groups, individuals)
          </label>
        </div>
      </fieldset>

      {/* Invitee Count */}
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3">
        <Users className="h-5 w-5 text-blue-600" />
        <span className="text-sm font-medium text-blue-800">Target audience: {totalInvitees}</span>
      </div>

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
            Next: Settings
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
