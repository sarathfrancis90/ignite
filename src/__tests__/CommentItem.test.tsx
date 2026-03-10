import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommentItem } from "@/components/ideas/CommentItem";
import type { CommentData } from "@/types/comment";

function createMockComment(overrides: Partial<CommentData> = {}): CommentData {
  return {
    id: "comment-1",
    content: "Test comment content",
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

describe("CommentItem", () => {
  const defaultProps = {
    depth: 0,
    currentUserId: "user-1",
    onReply: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onFlag: vi.fn(),
  };

  it("renders comment content and author", () => {
    const comment = createMockComment();
    render(<CommentItem comment={comment} {...defaultProps} />);

    expect(screen.getByText("Test comment content")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("shows deleted message for soft-deleted comments", () => {
    const comment = createMockComment({ deletedAt: new Date() });
    render(<CommentItem comment={comment} {...defaultProps} />);

    expect(
      screen.getByText("[This comment has been deleted]"),
    ).toBeInTheDocument();
  });

  it("shows private badge for private comments", () => {
    const comment = createMockComment({ isPrivate: true });
    render(<CommentItem comment={comment} {...defaultProps} />);

    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("shows flagged badge for flagged comments", () => {
    const comment = createMockComment({ isFlagged: true });
    render(<CommentItem comment={comment} {...defaultProps} />);

    expect(screen.getByText("Flagged")).toBeInTheDocument();
  });

  it("shows perspective badge when perspective is set", () => {
    const comment = createMockComment({ perspective: "Devil's Advocate" });
    render(<CommentItem comment={comment} {...defaultProps} />);

    expect(screen.getByText("Devil's Advocate")).toBeInTheDocument();
  });

  it("shows edit and delete buttons for the comment author", () => {
    const comment = createMockComment();
    render(
      <CommentItem
        comment={comment}
        {...defaultProps}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByTestId("edit-btn-comment-1")).toBeInTheDocument();
    expect(screen.getByTestId("delete-btn-comment-1")).toBeInTheDocument();
  });

  it("shows flag button for non-authors", () => {
    const comment = createMockComment();
    render(
      <CommentItem
        comment={comment}
        {...defaultProps}
        currentUserId="user-2"
      />,
    );

    expect(screen.getByTestId("flag-btn-comment-1")).toBeInTheDocument();
    expect(screen.queryByTestId("edit-btn-comment-1")).not.toBeInTheDocument();
  });

  it("calls onReply when reply button clicked", () => {
    const onReply = vi.fn();
    const comment = createMockComment();
    render(
      <CommentItem comment={comment} {...defaultProps} onReply={onReply} />,
    );

    fireEvent.click(screen.getByTestId("reply-btn-comment-1"));
    expect(onReply).toHaveBeenCalledWith("comment-1");
  });

  it("hides reply button at max depth", () => {
    const comment = createMockComment();
    render(<CommentItem comment={comment} {...defaultProps} depth={2} />);

    expect(screen.queryByTestId("reply-btn-comment-1")).not.toBeInTheDocument();
  });

  it("enters edit mode and saves changes", () => {
    const onEdit = vi.fn();
    const comment = createMockComment();
    render(<CommentItem comment={comment} {...defaultProps} onEdit={onEdit} />);

    fireEvent.click(screen.getByTestId("edit-btn-comment-1"));
    const input = screen.getByTestId("comment-edit-input");
    fireEvent.change(input, { target: { value: "Updated content" } });
    fireEvent.click(screen.getByTestId("comment-save-edit"));

    expect(onEdit).toHaveBeenCalledWith("comment-1", "Updated content");
  });

  it("renders nested replies", () => {
    const reply = createMockComment({
      id: "reply-1",
      content: "This is a reply",
      parentId: "comment-1",
    });
    const comment = createMockComment({ replies: [reply] });

    render(<CommentItem comment={comment} {...defaultProps} />);

    expect(screen.getByText("This is a reply")).toBeInTheDocument();
  });

  it("renders mention syntax as plain @name", () => {
    const comment = createMockComment({
      content: "Hey @[Jane Smith](user-2) what do you think?",
    });
    render(<CommentItem comment={comment} {...defaultProps} />);

    expect(
      screen.getByText("Hey @Jane Smith what do you think?"),
    ).toBeInTheDocument();
  });

  it("shows avatar placeholder with initials when no avatarUrl", () => {
    const comment = createMockComment();
    render(<CommentItem comment={comment} {...defaultProps} />);

    expect(screen.getByText("JD")).toBeInTheDocument();
  });
});
