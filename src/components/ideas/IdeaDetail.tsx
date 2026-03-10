"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Eye,
  Tag,
  Calendar,
  Loader2,
  Trash2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

interface IdeaDetailProps {
  ideaId: string;
}

function UserAvatar({
  image,
  name,
  className,
}: {
  image: string | null;
  name: string | null;
  className?: string;
}) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <Avatar className={className}>
      {image ? (
        <AvatarImage src={image} alt={name ?? "User"} />
      ) : (
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      )}
    </Avatar>
  );
}

export function IdeaDetail({ ideaId }: IdeaDetailProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const ideaQuery = trpc.idea.getById.useQuery({ id: ideaId }, { enabled: !!ideaId });

  const submitMutation = trpc.idea.submit.useMutation({
    onSuccess: () => {
      void utils.idea.getById.invalidate({ id: ideaId });
    },
  });

  const deleteMutation = trpc.idea.delete.useMutation({
    onSuccess: () => {
      const idea = ideaQuery.data;
      if (idea) {
        void utils.idea.list.invalidate({ campaignId: idea.campaignId });
      }
      router.push(idea ? `/campaigns/${idea.campaignId}` : "/campaigns");
    },
  });

  if (ideaQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (ideaQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">
          {ideaQuery.error.message === "Idea not found"
            ? "This idea does not exist."
            : "Failed to load idea. Please try again."}
        </p>
      </div>
    );
  }

  if (!ideaQuery.data) return null;

  const idea = ideaQuery.data;
  const isDraft = idea.status === "DRAFT";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/campaigns/${idea.campaignId}`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaign
        </Link>
        {idea.campaign && <span className="text-sm text-gray-400">/ {idea.campaign.title}</span>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-gray-900">{idea.title}</h1>
              <StatusBadge status={idea.status} />
            </div>
            {idea.teaser && <p className="mt-2 text-gray-600">{idea.teaser}</p>}
          </div>
          <div className="flex gap-2">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => submitMutation.mutate({ id: idea.id })}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Submit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            {idea.contributor && (
              <>
                <UserAvatar
                  image={idea.contributor.image}
                  name={idea.contributor.name}
                  className="h-6 w-6"
                />
                <span>{idea.contributor.name ?? idea.contributor.email}</span>
              </>
            )}
          </div>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(idea.createdAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {idea.likesCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {idea.commentsCount}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {idea.viewsCount}
          </span>
        </div>

        {idea.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {idea.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {idea.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-gray-900">Description</h2>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-600">
            {idea.description}
          </div>
        </div>
      )}

      {idea.category && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-2 font-display text-sm font-semibold text-gray-900">Category</h2>
          <p className="text-sm text-gray-600">{idea.category}</p>
        </div>
      )}

      {idea.coAuthors && idea.coAuthors.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-display text-sm font-semibold text-gray-900">Co-Authors</h2>
          <div className="flex flex-wrap gap-3">
            {idea.coAuthors.map((coAuthor) => (
              <div key={coAuthor.id} className="flex items-center gap-2">
                <UserAvatar image={coAuthor.image} name={coAuthor.name} className="h-7 w-7" />
                <span className="text-sm text-gray-700">{coAuthor.name ?? coAuthor.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Status" value={idea.status.replace(/_/g, " ")} />
        <MetricCard
          label="Submitted"
          value={
            idea.submittedAt ? new Date(idea.submittedAt).toLocaleDateString() : "Not submitted"
          }
        />
        <MetricCard label="Confidential" value={idea.isConfidential ? "Yes" : "No"} />
        <MetricCard label="Invention Disclosure" value={idea.inventionDisclosure ? "Yes" : "No"} />
      </div>

      {(submitMutation.error ?? deleteMutation.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {(submitMutation.error ?? deleteMutation.error)?.message}
        </div>
      )}

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Idea</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{idea.title}&rdquo;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMutation.mutate({ id: idea.id });
                setShowDeleteConfirm(false);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize text-gray-900">{value.toLowerCase()}</p>
    </div>
  );
}
