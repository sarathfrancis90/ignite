import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IdeaDiscussion } from "@/components/ideas/IdeaDiscussion";
import type { CommentData } from "@/types/comment";

// Mock socket hook
vi.mock("@/lib/use-idea-socket", () => ({
  useIdeaSocket: vi.fn(),
}));

function createMockComment(overrides: Partial<CommentData> = {}): CommentData {
  return {
    id: "comment-1",
    content: "First comment",
    isPrivate: false,
    perspective: null,
    authorId: "user-1",
    author: {
      id: "user-1",
      firstName: "John",
      lastName: "Doe",
      displayName: null,
      avatarUrl: null,
    },
    ideaId: "idea-1",
    parentId: null,
    isFlagged: false,
    flagCount: 0,
    mentions: [],
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
    deletedAt: null,
    replies: [],
    ...overrides,
  };
}

describe("IdeaDiscussion", () => {
  const mockOnAddComment = vi.fn();
  const mockOnUpdateComment = vi.fn();
  const mockOnDeleteComment = vi.fn();
  const mockOnFlagComment = vi.fn();
  const mockOnSearchUsers = vi.fn();

  const defaultProps = {
    ideaId: "idea-1",
    currentUserId: "user-1",
    initialComments: [] as CommentData[],
    onAddComment: mockOnAddComment,
    onUpdateComment: mockOnUpdateComment,
    onDeleteComment: mockOnDeleteComment,
    onFlagComment: mockOnFlagComment,
    onSearchUsers: mockOnSearchUsers,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no comments", () => {
    render(<IdeaDiscussion {...defaultProps} />);

    expect(
      screen.getByText("No comments yet. Be the first to share your thoughts!"),
    ).toBeInTheDocument();
    expect(screen.getByText("Discussion (0)")).toBeInTheDocument();
  });

  it("renders initial comments", () => {
    const comments = [
      createMockComment({ id: "c1", content: "Comment A" }),
      createMockComment({ id: "c2", content: "Comment B" }),
    ];
    render(<IdeaDiscussion {...defaultProps} initialComments={comments} />);

    expect(screen.getByText("Comment A")).toBeInTheDocument();
    expect(screen.getByText("Comment B")).toBeInTheDocument();
    expect(screen.getByText("Discussion (2)")).toBeInTheDocument();
  });

  it("shows comment form when user is logged in", () => {
    render(<IdeaDiscussion {...defaultProps} />);

    expect(screen.getByTestId("comment-form")).toBeInTheDocument();
    expect(screen.getByTestId("submit-comment")).toBeInTheDocument();
  });

  it("hides comment form when no user", () => {
    render(<IdeaDiscussion {...defaultProps} currentUserId={null} />);

    expect(screen.queryByTestId("comment-form")).not.toBeInTheDocument();
  });

  it("submits a new comment", async () => {
    const newComment = createMockComment({
      id: "new-1",
      content: "New comment!",
    });
    mockOnAddComment.mockResolvedValueOnce(newComment);

    render(<IdeaDiscussion {...defaultProps} />);

    const textarea = screen.getByTestId("comment-textarea");
    fireEvent.change(textarea, { target: { value: "New comment!" } });
    fireEvent.click(screen.getByTestId("submit-comment"));

    await waitFor(() => {
      expect(mockOnAddComment).toHaveBeenCalledWith({
        ideaId: "idea-1",
        content: "New comment!",
        isPrivate: false,
      });
    });
  });

  it("toggles private comment checkbox", () => {
    render(<IdeaDiscussion {...defaultProps} />);

    const toggle = screen.getByTestId("private-toggle");
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });

  it("shows reply form when reply button is clicked", () => {
    const comments = [createMockComment()];
    render(<IdeaDiscussion {...defaultProps} initialComments={comments} />);

    fireEvent.click(screen.getByTestId("reply-btn-comment-1"));
    expect(screen.getByTestId("reply-form")).toBeInTheDocument();
  });

  it("cancels reply form", () => {
    const comments = [createMockComment()];
    render(<IdeaDiscussion {...defaultProps} initialComments={comments} />);

    fireEvent.click(screen.getByTestId("reply-btn-comment-1"));
    expect(screen.getByTestId("reply-form")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("cancel-reply"));
    expect(screen.queryByTestId("reply-form")).not.toBeInTheDocument();
  });

  it("disables submit button when content is empty", () => {
    render(<IdeaDiscussion {...defaultProps} />);

    const submitBtn = screen.getByTestId("submit-comment");
    expect(submitBtn).toBeDisabled();
  });

  it("calls onDeleteComment when delete is clicked", async () => {
    mockOnDeleteComment.mockResolvedValueOnce(undefined);
    const comments = [createMockComment()];
    render(<IdeaDiscussion {...defaultProps} initialComments={comments} />);

    fireEvent.click(screen.getByTestId("delete-btn-comment-1"));

    await waitFor(() => {
      expect(mockOnDeleteComment).toHaveBeenCalledWith("comment-1");
    });
  });

  it("calls onFlagComment when flag is clicked by non-author", async () => {
    mockOnFlagComment.mockResolvedValueOnce(undefined);
    const comments = [createMockComment({ authorId: "user-2" })];
    render(<IdeaDiscussion {...defaultProps} initialComments={comments} />);

    fireEvent.click(screen.getByTestId("flag-btn-comment-1"));

    await waitFor(() => {
      expect(mockOnFlagComment).toHaveBeenCalledWith("comment-1");
    });
  });
});
