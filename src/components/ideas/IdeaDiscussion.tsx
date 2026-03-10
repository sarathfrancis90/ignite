"use client";

import { useState, useCallback } from "react";
import type { CommentData, CommentEvent } from "@/types/comment";
import { CommentItem } from "./CommentItem";
import { MentionInput } from "./MentionInput";
import { useIdeaSocket } from "@/lib/use-idea-socket";

interface MentionUser {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface IdeaDiscussionProps {
  ideaId: string;
  currentUserId: string | null;
  initialComments: CommentData[];
  onAddComment: (params: {
    ideaId: string;
    content: string;
    parentId?: string;
    isPrivate?: boolean;
  }) => Promise<CommentData>;
  onUpdateComment: (params: {
    commentId: string;
    content: string;
  }) => Promise<CommentData>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onFlagComment: (commentId: string) => Promise<void>;
  onSearchUsers: (query: string) => Promise<MentionUser[]>;
}

function updateCommentInList(
  comments: CommentData[],
  commentId: string,
  updater: (comment: CommentData) => CommentData,
): CommentData[] {
  return comments.map((c) => {
    if (c.id === commentId) return updater(c);
    if (c.replies?.length) {
      return {
        ...c,
        replies: updateCommentInList(c.replies, commentId, updater),
      };
    }
    return c;
  });
}

function addReplyToComment(
  comments: CommentData[],
  parentId: string,
  reply: CommentData,
): CommentData[] {
  return comments.map((c) => {
    if (c.id === parentId) {
      return { ...c, replies: [...(c.replies ?? []), reply] };
    }
    if (c.replies?.length) {
      return {
        ...c,
        replies: addReplyToComment(c.replies, parentId, reply),
      };
    }
    return c;
  });
}

export function IdeaDiscussion({
  ideaId,
  currentUserId,
  initialComments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onFlagComment,
  onSearchUsers,
}: IdeaDiscussionProps) {
  const [comments, setComments] = useState<CommentData[]>(initialComments);
  const [newContent, setNewContent] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSocketEvent = useCallback((event: CommentEvent) => {
    switch (event.type) {
      case "comment:added": {
        const comment = event.comment;
        if (comment.parentId) {
          setComments((prev) =>
            addReplyToComment(prev, comment.parentId!, comment),
          );
        } else {
          setComments((prev) => [comment, ...prev]);
        }
        break;
      }
      case "comment:updated":
        setComments((prev) =>
          updateCommentInList(prev, event.comment.id, () => event.comment),
        );
        break;
      case "comment:deleted":
        setComments((prev) =>
          updateCommentInList(prev, event.comment.id, (c) => ({
            ...c,
            deletedAt: new Date(),
          })),
        );
        break;
      case "comment:flagged":
        setComments((prev) =>
          updateCommentInList(prev, event.comment.id, (c) => ({
            ...c,
            isFlagged: true,
            flagCount: c.flagCount + 1,
          })),
        );
        break;
    }
  }, []);

  useIdeaSocket(ideaId, handleSocketEvent);

  const handleSubmitComment = async () => {
    if (!newContent.trim() || !currentUserId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const comment = await onAddComment({
        ideaId,
        content: newContent,
        isPrivate,
      });
      setComments((prev) => [comment, ...prev]);
      setNewContent("");
      setIsPrivate(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !replyToId || !currentUserId || isSubmitting)
      return;
    setIsSubmitting(true);
    try {
      const reply = await onAddComment({
        ideaId,
        content: replyContent,
        parentId: replyToId,
      });
      setComments((prev) => addReplyToComment(prev, replyToId, reply));
      setReplyContent("");
      setReplyToId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    const updated = await onUpdateComment({ commentId, content });
    setComments((prev) => updateCommentInList(prev, commentId, () => updated));
  };

  const handleDelete = async (commentId: string) => {
    await onDeleteComment(commentId);
    setComments((prev) =>
      updateCommentInList(prev, commentId, (c) => ({
        ...c,
        deletedAt: new Date(),
      })),
    );
  };

  const handleFlag = async (commentId: string) => {
    await onFlagComment(commentId);
    setComments((prev) =>
      updateCommentInList(prev, commentId, (c) => ({
        ...c,
        isFlagged: true,
        flagCount: c.flagCount + 1,
      })),
    );
  };

  const handleReply = (parentId: string) => {
    setReplyToId(parentId);
    setReplyContent("");
  };

  return (
    <div className="idea-discussion" data-testid="idea-discussion">
      <h3 className="discussion-title">Discussion ({comments.length})</h3>

      {currentUserId && (
        <div className="comment-form" data-testid="comment-form">
          <MentionInput
            value={newContent}
            onChange={setNewContent}
            onSearchUsers={onSearchUsers}
            placeholder="Write a comment... Use @ to mention someone"
            disabled={isSubmitting}
          />
          <div className="comment-form-actions">
            <label className="private-toggle">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                data-testid="private-toggle"
              />
              Private comment
            </label>
            <button
              onClick={handleSubmitComment}
              disabled={!newContent.trim() || isSubmitting}
              className="btn btn-primary"
              data-testid="submit-comment"
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>
      )}

      {replyToId && currentUserId && (
        <div className="reply-form" data-testid="reply-form">
          <div className="reply-form-header">
            <span>Replying to comment</span>
            <button
              onClick={() => setReplyToId(null)}
              className="btn-action"
              data-testid="cancel-reply"
            >
              Cancel
            </button>
          </div>
          <MentionInput
            value={replyContent}
            onChange={setReplyContent}
            onSearchUsers={onSearchUsers}
            placeholder="Write a reply..."
            disabled={isSubmitting}
          />
          <button
            onClick={handleSubmitReply}
            disabled={!replyContent.trim() || isSubmitting}
            className="btn btn-primary btn-sm"
            data-testid="submit-reply"
          >
            {isSubmitting ? "Posting..." : "Post Reply"}
          </button>
        </div>
      )}

      <div className="comment-list" data-testid="comment-list">
        {comments.length === 0 ? (
          <p className="no-comments">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              currentUserId={currentUserId}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onFlag={handleFlag}
            />
          ))
        )}
      </div>
    </div>
  );
}
