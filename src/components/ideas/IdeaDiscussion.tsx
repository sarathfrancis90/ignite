"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MessageCircle,
  Reply,
  CornerDownRight,
  Loader2,
  Trash2,
  Flag,
  FlagOff,
  Pencil,
  Send,
  X,
  AtSign,
  Search,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

interface MentionedUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface SerializedComment {
  id: string;
  content: string;
  ideaId: string;
  authorId: string;
  parentId: string | null;
  flagged: boolean;
  createdAt: string;
  updatedAt: string;
  author?: MentionedUser;
  mentions?: MentionedUser[];
  replies?: SerializedComment[];
}

interface IdeaDiscussionProps {
  ideaId: string;
}

function getInitials(name: string | null, email?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email ? email.slice(0, 2).toUpperCase() : "?";
}

function CommentAvatar({ user }: { user?: MentionedUser }) {
  if (!user) return null;
  return (
    <Avatar className="h-8 w-8 shrink-0">
      {user.image ? (
        <AvatarImage src={user.image} alt={user.name ?? "User"} />
      ) : (
        <AvatarFallback className="text-[10px]">
          {getInitials(user.name, user.email)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

function MentionPicker({
  onSelect,
  onClose,
}: {
  onSelect: (user: MentionedUser) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { data: searchResults, isFetching } = trpc.campaign.searchUsers.useQuery(
    { search: searchQuery, limit: 8, excludeIds: [] },
    { enabled: searchQuery.length >= 2 },
  );

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div ref={containerRef} className="relative mt-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users to mention..."
          className="pl-10 text-sm"
          autoFocus
        />
      </div>
      {searchQuery.length >= 2 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {isFetching && <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>}
          {!isFetching && searchResults && searchResults.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500">No users found</div>
          )}
          {!isFetching &&
            searchResults?.map((user) => (
              <button
                key={user.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                onClick={() => {
                  onSelect(user);
                  onClose();
                }}
              >
                <CommentAvatar user={user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {user.name ?? "Unnamed"}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
                <UserPlus className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function CommentForm({
  ideaId,
  parentId,
  onSuccess,
  onCancel,
  autoFocus = false,
}: {
  ideaId: string;
  parentId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [content, setContent] = React.useState("");
  const [showMentionPicker, setShowMentionPicker] = React.useState(false);
  const [mentionedUsers, setMentionedUsers] = React.useState<MentionedUser[]>([]);

  const createMutation = trpc.comment.create.useMutation({
    onSuccess: () => {
      setContent("");
      setMentionedUsers([]);
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createMutation.mutate({
      ideaId,
      content: content.trim(),
      parentId,
      mentionedUserIds: mentionedUsers.map((u) => u.id),
    });
  };

  const handleMentionSelect = (user: MentionedUser) => {
    if (!mentionedUsers.some((u) => u.id === user.id)) {
      setMentionedUsers((prev) => [...prev, user]);
      setContent((prev) => `${prev}@${user.name ?? user.email} `);
    }
  };

  const removeMention = (userId: string) => {
    setMentionedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? "Write a reply..." : "Join the discussion..."}
        className="min-h-[80px] resize-none text-sm"
        autoFocus={autoFocus}
      />

      {mentionedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mentionedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
            >
              @{user.name ?? user.email}
              <button
                type="button"
                onClick={() => removeMention(user.id)}
                className="text-blue-500 hover:text-blue-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {showMentionPicker && (
        <MentionPicker onSelect={handleMentionSelect} onClose={() => setShowMentionPicker(false)} />
      )}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700"
          onClick={() => setShowMentionPicker(!showMentionPicker)}
        >
          <AtSign className="mr-1 h-3.5 w-3.5" />
          Mention
        </Button>

        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!content.trim() || createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            {parentId ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>

      {createMutation.error && (
        <p className="text-xs text-red-600">{createMutation.error.message}</p>
      )}
    </form>
  );
}

function EditCommentForm({
  comment,
  onSuccess,
  onCancel,
}: {
  comment: SerializedComment;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [content, setContent] = React.useState(comment.content);

  const updateMutation = trpc.comment.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    updateMutation.mutate({
      id: comment.id,
      content: content.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[60px] resize-none text-sm"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!content.trim() || updateMutation.isPending}>
          {updateMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Save
        </Button>
      </div>
      {updateMutation.error && (
        <p className="text-xs text-red-600">{updateMutation.error.message}</p>
      )}
    </form>
  );
}

function CommentItem({
  comment,
  currentUserId,
  ideaId,
  depth,
  onRefresh,
}: {
  comment: SerializedComment;
  currentUserId: string;
  ideaId: string;
  depth: number;
  onRefresh: () => void;
}) {
  const [showReplyForm, setShowReplyForm] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  const deleteMutation = trpc.comment.delete.useMutation({
    onSuccess: () => onRefresh(),
  });

  const flagMutation = trpc.comment.flag.useMutation({
    onSuccess: () => onRefresh(),
  });

  const isAuthor = comment.authorId === currentUserId;
  const canReply = depth < 2;
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
  const wasEdited = comment.createdAt !== comment.updatedAt;

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-gray-100 pl-4" : ""}>
      <div className="group flex gap-3 py-3">
        <CommentAvatar user={comment.author} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {comment.author?.name ?? comment.author?.email ?? "Unknown"}
            </span>
            <span className="text-xs text-gray-400">{timeAgo}</span>
            {wasEdited && <span className="text-xs text-gray-400">(edited)</span>}
            {comment.flagged && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Flagged
              </span>
            )}
          </div>

          {isEditing ? (
            <EditCommentForm
              comment={comment}
              onSuccess={() => {
                setIsEditing(false);
                onRefresh();
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{comment.content}</p>

              {comment.mentions && comment.mentions.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {comment.mentions.map((user) => (
                    <span key={user.id} className="text-xs font-medium text-blue-600">
                      @{user.name ?? user.email}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {canReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-gray-500"
                    onClick={() => setShowReplyForm(!showReplyForm)}
                  >
                    <Reply className="mr-1 h-3 w-3" />
                    Reply
                  </Button>
                )}
                {isAuthor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-gray-500"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                )}
                {isAuthor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
                    onClick={() => deleteMutation.mutate({ id: comment.id })}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1 h-3 w-3" />
                    )}
                    Delete
                  </Button>
                )}
                {!isAuthor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-gray-500"
                    onClick={() =>
                      flagMutation.mutate({ id: comment.id, flagged: !comment.flagged })
                    }
                    disabled={flagMutation.isPending}
                  >
                    {comment.flagged ? (
                      <>
                        <FlagOff className="mr-1 h-3 w-3" />
                        Unflag
                      </>
                    ) : (
                      <>
                        <Flag className="mr-1 h-3 w-3" />
                        Flag
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}

          {deleteMutation.error && (
            <p className="mt-1 text-xs text-red-600">{deleteMutation.error.message}</p>
          )}
        </div>
      </div>

      {showReplyForm && (
        <div className="mb-3 ml-11">
          <CommentForm
            ideaId={ideaId}
            parentId={comment.id}
            autoFocus
            onSuccess={() => {
              setShowReplyForm(false);
              onRefresh();
            }}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              ideaId={ideaId}
              depth={depth + 1}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function IdeaDiscussion({ ideaId }: IdeaDiscussionProps) {
  const utils = trpc.useUtils();

  const commentsQuery = trpc.comment.list.useQuery({ ideaId, limit: 50 }, { enabled: !!ideaId });

  // Get current user from session (use auth router)
  const sessionQuery = trpc.auth.getSession.useQuery();
  const currentUserId = sessionQuery.data?.user?.id ?? "";

  const handleRefresh = () => {
    void utils.comment.list.invalidate({ ideaId });
    void utils.idea.getById.invalidate({ id: ideaId });
  };

  const comments = commentsQuery.data?.items ?? [];
  const hasComments = comments.length > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-gray-900">
        <MessageCircle className="h-5 w-5" />
        Discussion
        {hasComments && (
          <span className="text-sm font-normal text-gray-500">({comments.length})</span>
        )}
      </h2>

      {/* New comment form */}
      <div className="mb-6">
        <CommentForm ideaId={ideaId} onSuccess={handleRefresh} />
      </div>

      {/* Comments list */}
      {commentsQuery.isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 animate-pulse rounded bg-gray-100" />
                <div className="h-12 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {commentsQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
          Failed to load comments. Please try again.
        </div>
      )}

      {!commentsQuery.isLoading && !hasComments && (
        <div className="py-8 text-center">
          <CornerDownRight className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No comments yet. Start the discussion!</p>
        </div>
      )}

      {hasComments && (
        <div className="divide-y divide-gray-100">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment as SerializedComment}
              currentUserId={currentUserId}
              ideaId={ideaId}
              depth={0}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      {commentsQuery.data?.nextCursor && (
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" className="text-gray-500">
            Load more comments
          </Button>
        </div>
      )}
    </div>
  );
}
