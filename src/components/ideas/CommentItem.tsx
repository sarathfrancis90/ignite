"use client";

import { useState } from "react";
import Image from "next/image";
import type { CommentData } from "@/types/comment";

interface CommentItemProps {
  comment: CommentData;
  depth: number;
  currentUserId: string | null;
  onReply: (parentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onFlag: (commentId: string) => void;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderContent(content: string): string {
  // Convert @[Name](userId) to highlighted @Name
  return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
}

export function CommentItem({
  comment,
  depth,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onFlag,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isAuthor = currentUserId === comment.authorId;
  const isDeleted = comment.deletedAt !== null;
  const authorName =
    comment.author.displayName ??
    `${comment.author.firstName} ${comment.author.lastName}`;

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(comment.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  if (isDeleted) {
    return (
      <div
        className="comment-item comment-deleted"
        style={{ marginLeft: depth * 24 }}
        data-testid={`comment-${comment.id}`}
      >
        <p className="comment-deleted-text">[This comment has been deleted]</p>
      </div>
    );
  }

  return (
    <div
      className="comment-item"
      style={{ marginLeft: depth * 24 }}
      data-testid={`comment-${comment.id}`}
      id={`comment-${comment.id}`}
    >
      <div className="comment-header">
        <div className="comment-avatar">
          {comment.author.avatarUrl ? (
            <Image
              src={comment.author.avatarUrl}
              alt={authorName}
              width={32}
              height={32}
              className="avatar-img"
            />
          ) : (
            <div className="avatar-placeholder">
              {comment.author.firstName[0]}
              {comment.author.lastName[0]}
            </div>
          )}
        </div>
        <div className="comment-meta">
          <span className="comment-author">{authorName}</span>
          <span className="comment-date">{formatDate(comment.createdAt)}</span>
          {comment.isPrivate && (
            <span className="comment-badge comment-private">Private</span>
          )}
          {comment.perspective && (
            <span className="comment-badge comment-perspective">
              {comment.perspective}
            </span>
          )}
          {comment.isFlagged && (
            <span className="comment-badge comment-flagged">Flagged</span>
          )}
        </div>
      </div>

      <div className="comment-body">
        {isEditing ? (
          <div className="comment-edit-form">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="comment-edit-textarea"
              data-testid="comment-edit-input"
            />
            <div className="comment-edit-actions">
              <button
                onClick={handleSaveEdit}
                className="btn btn-primary btn-sm"
                data-testid="comment-save-edit"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="comment-content">{renderContent(comment.content)}</p>
        )}
      </div>

      <div className="comment-actions">
        {depth < 2 && (
          <button
            onClick={() => onReply(comment.id)}
            className="btn-action"
            data-testid={`reply-btn-${comment.id}`}
          >
            Reply
          </button>
        )}
        {isAuthor && !isEditing && (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="btn-action"
              data-testid={`edit-btn-${comment.id}`}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(comment.id)}
              className="btn-action btn-action-danger"
              data-testid={`delete-btn-${comment.id}`}
            >
              Delete
            </button>
          </>
        )}
        {!isAuthor && (
          <button
            onClick={() => onFlag(comment.id)}
            className="btn-action"
            data-testid={`flag-btn-${comment.id}`}
          >
            Flag
          </button>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onFlag={onFlag}
            />
          ))}
        </div>
      )}
    </div>
  );
}
