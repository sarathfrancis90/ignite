"use client";

import * as React from "react";
import { ChevronRight, Undo2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

type CampaignStatusValue =
  | "DRAFT"
  | "SEEDING"
  | "SUBMISSION"
  | "DISCUSSION_VOTING"
  | "EVALUATION"
  | "CLOSED";

interface CampaignPhaseControlsProps {
  campaignId: string;
  currentStatus: CampaignStatusValue;
  onTransitionComplete?: () => void;
}

interface TransitionOption {
  targetStatus: CampaignStatusValue;
  label: string;
  guardsPass: boolean;
  guardFailures: Array<{ guard: string; message: string }>;
}

export function CampaignPhaseControls({
  campaignId,
  currentStatus,
  onTransitionComplete,
}: CampaignPhaseControlsProps) {
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    target: TransitionOption | null;
    type: "advance" | "revert";
  }>({ open: false, target: null, type: "advance" });

  const utils = trpc.useUtils();

  const transitionsQuery = trpc.campaign.getTransitions.useQuery(
    { id: campaignId },
    { enabled: currentStatus !== "CLOSED" },
  );

  const transitionMutation = trpc.campaign.transition.useMutation({
    onSuccess: () => {
      void utils.campaign.getById.invalidate({ id: campaignId });
      void utils.campaign.getTransitions.invalidate({ id: campaignId });
      void utils.campaign.list.invalidate();
      setConfirmDialog({ open: false, target: null, type: "advance" });
      onTransitionComplete?.();
    },
  });

  const revertMutation = trpc.campaign.revert.useMutation({
    onSuccess: () => {
      void utils.campaign.getById.invalidate({ id: campaignId });
      void utils.campaign.getTransitions.invalidate({ id: campaignId });
      void utils.campaign.list.invalidate();
      setConfirmDialog({ open: false, target: null, type: "revert" });
      onTransitionComplete?.();
    },
  });

  const data = transitionsQuery.data;

  if (currentStatus === "CLOSED" || !data) {
    return null;
  }

  const handleAdvanceClick = (transition: TransitionOption) => {
    setConfirmDialog({ open: true, target: transition, type: "advance" });
  };

  const handleRevertClick = () => {
    setConfirmDialog({ open: true, target: null, type: "revert" });
  };

  const handleConfirm = () => {
    if (confirmDialog.type === "revert") {
      revertMutation.mutate({ id: campaignId });
    } else if (confirmDialog.target) {
      transitionMutation.mutate({
        id: campaignId,
        targetStatus: confirmDialog.target.targetStatus,
      });
    }
  };

  const isLoading = transitionMutation.isPending || revertMutation.isPending;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {data.transitions.map((transition) => (
          <Button
            key={transition.targetStatus}
            onClick={() => handleAdvanceClick(transition as TransitionOption)}
            disabled={!transition.guardsPass}
            size="sm"
          >
            <ChevronRight className="mr-1 h-4 w-4" />
            Advance to {transition.label}
          </Button>
        ))}
        {data.canRevert && data.previousStatus && (
          <Button variant="outline" size="sm" onClick={handleRevertClick}>
            <Undo2 className="mr-1 h-4 w-4" />
            Revert Phase
          </Button>
        )}
      </div>

      {/* Guard failure hints */}
      {data.transitions.some((t) => !t.guardsPass) && (
        <div className="mt-2 space-y-1">
          {data.transitions
            .filter((t) => !t.guardsPass)
            .flatMap((t) =>
              t.guardFailures.map((f) => (
                <div
                  key={`${t.targetStatus}-${f.guard}`}
                  className="flex items-start gap-1.5 text-xs text-amber-600"
                >
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{f.message}</span>
                </div>
              )),
            )}
        </div>
      )}

      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === "revert" ? "Revert Phase" : "Advance Phase"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === "revert"
                ? `Are you sure you want to revert this campaign from ${data.currentLabel} to the previous phase? This will undo the last phase transition.`
                : `Are you sure you want to advance this campaign from ${data.currentLabel} to ${confirmDialog.target?.label ?? "the next phase"}? This action cannot be easily undone.`}
            </DialogDescription>
          </DialogHeader>
          {transitionMutation.isError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {transitionMutation.error.message}
            </div>
          )}
          {revertMutation.isError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {revertMutation.error.message}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              variant={confirmDialog.type === "revert" ? "secondary" : "default"}
            >
              {isLoading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {confirmDialog.type === "revert" ? "Revert" : "Advance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
