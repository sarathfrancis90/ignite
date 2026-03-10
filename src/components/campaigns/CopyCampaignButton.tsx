"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface CopyCampaignButtonProps {
  campaignId: string;
  campaignTitle: string;
}

export function CopyCampaignButton({ campaignId, campaignTitle }: CopyCampaignButtonProps) {
  const router = useRouter();
  const [isCopying, setIsCopying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const copyMutation = trpc.campaign.copy.useMutation();

  const handleCopy = () => {
    setIsCopying(true);
    setError(null);
    copyMutation.mutate(
      {
        sourceCampaignId: campaignId,
        title: `${campaignTitle} (Copy)`,
      },
      {
        onSuccess: (newCampaign) => {
          router.push(`/campaigns/${newCampaign.id}`);
        },
        onError: (err) => {
          setError(err.message);
          setIsCopying(false);
        },
        onSettled: () => {
          setIsCopying(false);
        },
      },
    );
  };

  return (
    <div>
      <Button variant="outline" size="sm" disabled={isCopying} onClick={handleCopy}>
        <Copy className="mr-2 h-4 w-4" />
        {isCopying ? "Copying..." : "Copy Campaign"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
