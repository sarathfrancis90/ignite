import type { Idea } from "@/types/idea";

export function createMockIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: "idea-1",
    title: "Automated Quality Alerts",
    description:
      "<p>Implement automated alerts when quality metrics drop below threshold.</p>",
    status: "COMMUNITY_DISCUSSION",
    author: {
      id: "user-1",
      name: "John Doe",
      avatarUrl: null,
    },
    category: {
      id: "cat-1",
      name: "Process Improvement",
      color: "#6366F1",
    },
    tags: [
      { id: "tag-1", name: "automation" },
      { id: "tag-2", name: "quality" },
    ],
    customFields: [
      {
        id: "cf-1",
        label: "Expected Impact",
        type: "SELECTION",
        value: "High",
      },
      {
        id: "cf-2",
        label: "Requires Budget",
        type: "CHECKBOX",
        value: true,
      },
    ],
    attachments: [
      {
        id: "att-1",
        fileName: "proposal.pdf",
        fileUrl: "/files/proposal.pdf",
        fileSize: 102400,
        mimeType: "application/pdf",
      },
    ],
    voteAverage: 4.2,
    voteCount: 15,
    commentCount: 8,
    likeCount: 23,
    isHot: true,
    bucketId: "bucket-1",
    bucketName: "Review",
    campaignId: "campaign-1",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-02-20T14:30:00Z",
    ...overrides,
  };
}

export const mockIdeaA = createMockIdea();

export const mockIdeaB = createMockIdea({
  id: "idea-2",
  title: "Smart Resource Scheduling",
  description: "<p>Use AI to optimize resource allocation across projects.</p>",
  status: "EVALUATION",
  author: {
    id: "user-2",
    name: "Jane Smith",
    avatarUrl: "https://example.com/avatar.jpg",
  },
  category: {
    id: "cat-2",
    name: "Technology",
    color: "#10B981",
  },
  tags: [{ id: "tag-3", name: "AI" }],
  customFields: [
    {
      id: "cf-1",
      label: "Expected Impact",
      type: "SELECTION",
      value: "Medium",
    },
    {
      id: "cf-2",
      label: "Requires Budget",
      type: "CHECKBOX",
      value: false,
    },
  ],
  attachments: [],
  voteAverage: 3.8,
  voteCount: 10,
  commentCount: 12,
  likeCount: 18,
  isHot: false,
  bucketId: null,
  bucketName: null,
  createdAt: "2026-02-01T09:00:00Z",
  updatedAt: "2026-03-01T11:00:00Z",
});
