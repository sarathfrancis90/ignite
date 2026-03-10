export const IDEA_STATUSES = [
  "DRAFT",
  "QUALIFICATION",
  "COMMUNITY_DISCUSSION",
  "HOT",
  "EVALUATION",
  "SELECTED_CONCEPT",
  "IMPLEMENTATION",
  "IMPLEMENTED",
  "ARCHIVED",
  "REJECTED",
] as const;

export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export interface IdeaAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface IdeaCategory {
  id: string;
  name: string;
  color: string;
}

export interface IdeaTag {
  id: string;
  name: string;
}

export interface IdeaCustomField {
  id: string;
  label: string;
  type: "TEXT" | "KEYWORD" | "SELECTION" | "CHECKBOX";
  value: string | boolean | null;
}

export interface IdeaAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  author: IdeaAuthor;
  category: IdeaCategory | null;
  tags: IdeaTag[];
  customFields: IdeaCustomField[];
  attachments: IdeaAttachment[];
  voteAverage: number | null;
  voteCount: number;
  commentCount: number;
  likeCount: number;
  isHot: boolean;
  bucketId: string | null;
  bucketName: string | null;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
}
