"use client";

import { useState } from "react";
import { MessageSquare, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";

interface UseCaseDiscussionsProps {
  useCaseId: string;
}

export function UseCaseDiscussions({ useCaseId }: UseCaseDiscussionsProps) {
  const [content, setContent] = useState("");

  const utils = trpc.useUtils();
  const discussionsQuery = trpc.useCase.listDiscussions.useQuery({
    useCaseId,
    limit: 50,
  });

  const createDiscussion = trpc.useCase.createDiscussion.useMutation({
    onSuccess: () => {
      utils.useCase.listDiscussions.invalidate({ useCaseId });
      setContent("");
    },
  });

  const deleteDiscussion = trpc.useCase.deleteDiscussion.useMutation({
    onSuccess: () => {
      utils.useCase.listDiscussions.invalidate({ useCaseId });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    createDiscussion.mutate({ useCaseId, content: content.trim(), isInternal: true });
  }

  function getInitials(name: string | null, email: string): string {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary-600" />
          Internal Discussions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="mb-4">
          <Textarea
            placeholder="Add a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <div className="mt-2 flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={createDiscussion.isPending || !content.trim()}
            >
              <Send className="mr-1 h-4 w-4" />
              Post
            </Button>
          </div>
        </form>

        {discussionsQuery.isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        )}

        <div className="space-y-4">
          {discussionsQuery.data?.items.map((discussion) => (
            <div key={discussion.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">
                  {getInitials(discussion.author.name, discussion.author.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {discussion.author.name ?? discussion.author.email}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(discussion.createdAt).toLocaleString()}
                  </span>
                  <button
                    onClick={() => deleteDiscussion.mutate({ id: discussion.id })}
                    className="ml-auto text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {discussion.content}
                </p>
              </div>
            </div>
          ))}
          {discussionsQuery.data?.items.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">
              No discussions yet. Start the conversation above.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
