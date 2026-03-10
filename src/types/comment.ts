export interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface CommentData {
  id: string;
  content: string;
  isPrivate: boolean;
  perspective: string | null;
  authorId: string;
  author: CommentAuthor;
  ideaId: string | null;
  parentId: string | null;
  isFlagged: boolean;
  flagCount: number;
  mentions: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  replies: CommentData[];
}

export interface CommentEvent {
  type:
    | "comment:added"
    | "comment:updated"
    | "comment:deleted"
    | "comment:flagged";
  ideaId: string;
  comment: CommentData;
}
