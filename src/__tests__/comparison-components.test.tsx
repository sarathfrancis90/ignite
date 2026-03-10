import { render, screen, fireEvent } from "@testing-library/react";
import { useComparisonStore } from "@/stores/comparison-store";
import { ComparisonPanel } from "@/components/comparison/ComparisonPanel";
import { ComparisonToolbar } from "@/components/comparison/ComparisonToolbar";
import { CompareButton } from "@/components/comparison/CompareButton";
import { ComparisonMode } from "@/components/comparison/ComparisonMode";
import { mockIdeaA, mockIdeaB } from "./fixtures";

describe("ComparisonPanel", () => {
  const defaultProps = {
    idea: mockIdeaA,
    position: "left" as const,
    onClose: jest.fn(),
    onChangeIdea: jest.fn(),
  };

  it("renders idea title", () => {
    render(<ComparisonPanel {...defaultProps} />);
    expect(screen.getByTestId("idea-title")).toHaveTextContent(
      "Automated Quality Alerts",
    );
  });

  it("renders author name", () => {
    render(<ComparisonPanel {...defaultProps} />);
    expect(screen.getByTestId("idea-author")).toHaveTextContent("John Doe");
  });

  it("renders status badge", () => {
    render(<ComparisonPanel {...defaultProps} />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent(
      "COMMUNITY DISCUSSION",
    );
  });

  it("renders HOT badge when idea is hot", () => {
    render(<ComparisonPanel {...defaultProps} />);
    expect(screen.getByTestId("hot-badge")).toBeInTheDocument();
  });

  it("does not render HOT badge when idea is not hot", () => {
    render(<ComparisonPanel {...defaultProps} idea={mockIdeaB} />);
    expect(screen.queryByTestId("hot-badge")).not.toBeInTheDocument();
  });

  it("renders category", () => {
    render(<ComparisonPanel {...defaultProps} />);
    expect(screen.getByTestId("idea-category")).toHaveTextContent(
      "Process Improvement",
    );
  });

  it("renders tags", () => {
    render(<ComparisonPanel {...defaultProps} />);
    const tags = screen.getByTestId("idea-tags");
    expect(tags).toHaveTextContent("automation");
    expect(tags).toHaveTextContent("quality");
  });

  it("renders metrics", () => {
    render(<ComparisonPanel {...defaultProps} />);
    expect(screen.getByTestId("metric-vote-avg")).toHaveTextContent("4.2");
    expect(screen.getByTestId("metric-comments")).toHaveTextContent("8");
    expect(screen.getByTestId("metric-likes")).toHaveTextContent("23");
  });

  it("renders custom fields", () => {
    render(<ComparisonPanel {...defaultProps} />);
    const fields = screen.getByTestId("custom-fields");
    expect(fields).toHaveTextContent("Expected Impact");
    expect(fields).toHaveTextContent("High");
    expect(fields).toHaveTextContent("Requires Budget");
    expect(fields).toHaveTextContent("Yes");
  });

  it("renders attachments", () => {
    render(<ComparisonPanel {...defaultProps} />);
    const attachments = screen.getByTestId("idea-attachments");
    expect(attachments).toHaveTextContent("proposal.pdf");
  });

  it("calls onClose when close button clicked", () => {
    const onClose = jest.fn();
    render(<ComparisonPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("close-left-panel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onChangeIdea when change button clicked", () => {
    const onChangeIdea = jest.fn();
    render(<ComparisonPanel {...defaultProps} onChangeIdea={onChangeIdea} />);
    fireEvent.click(screen.getByTestId("change-left-idea"));
    expect(onChangeIdea).toHaveBeenCalledTimes(1);
  });

  it("displays position label correctly", () => {
    const { rerender } = render(<ComparisonPanel {...defaultProps} />);
    expect(screen.getByText("Idea A")).toBeInTheDocument();

    rerender(<ComparisonPanel {...defaultProps} position="right" />);
    expect(screen.getByText("Idea B")).toBeInTheDocument();
  });
});

describe("ComparisonToolbar", () => {
  const defaultProps = {
    onSwap: jest.fn(),
    onExit: jest.fn(),
    leftTitle: "Idea A Title",
    rightTitle: "Idea B Title",
  };

  it("renders both titles", () => {
    render(<ComparisonToolbar {...defaultProps} />);
    expect(screen.getByText("Idea A Title")).toBeInTheDocument();
    expect(screen.getByText("Idea B Title")).toBeInTheDocument();
  });

  it("renders vs separator", () => {
    render(<ComparisonToolbar {...defaultProps} />);
    expect(screen.getByText("vs")).toBeInTheDocument();
  });

  it("calls onSwap when Swap button clicked", () => {
    const onSwap = jest.fn();
    render(<ComparisonToolbar {...defaultProps} onSwap={onSwap} />);
    fireEvent.click(screen.getByTestId("swap-ideas-btn"));
    expect(onSwap).toHaveBeenCalledTimes(1);
  });

  it("calls onExit when Exit Comparison clicked", () => {
    const onExit = jest.fn();
    render(<ComparisonToolbar {...defaultProps} onExit={onExit} />);
    fireEvent.click(screen.getByTestId("exit-comparison-btn"));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe("CompareButton", () => {
  beforeEach(() => {
    useComparisonStore.setState({
      isActive: false,
      leftIdea: null,
      rightIdea: null,
    });
  });

  it("is disabled when fewer than 2 ideas selected", () => {
    render(<CompareButton selectedIdeas={[mockIdeaA]} />);
    expect(screen.getByTestId("compare-btn")).toBeDisabled();
  });

  it("is enabled when exactly 2 ideas selected", () => {
    render(<CompareButton selectedIdeas={[mockIdeaA, mockIdeaB]} />);
    expect(screen.getByTestId("compare-btn")).not.toBeDisabled();
  });

  it("enters comparison mode when clicked with 2 ideas", () => {
    render(<CompareButton selectedIdeas={[mockIdeaA, mockIdeaB]} />);
    fireEvent.click(screen.getByTestId("compare-btn"));
    const state = useComparisonStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.leftIdea?.id).toBe("idea-1");
    expect(state.rightIdea?.id).toBe("idea-2");
  });

  it("is hidden when comparison is already active", () => {
    useComparisonStore.setState({ isActive: true });
    render(<CompareButton selectedIdeas={[mockIdeaA, mockIdeaB]} />);
    expect(screen.queryByTestId("compare-btn")).not.toBeInTheDocument();
  });

  it("shows selection count", () => {
    render(<CompareButton selectedIdeas={[mockIdeaA]} />);
    expect(screen.getByText("(1/2)")).toBeInTheDocument();
  });
});

describe("ComparisonMode", () => {
  const onChangeIdea = jest.fn();

  beforeEach(() => {
    onChangeIdea.mockClear();
    useComparisonStore.setState({
      isActive: true,
      leftIdea: mockIdeaA,
      rightIdea: mockIdeaB,
    });
  });

  it("renders both panels when both ideas present", () => {
    render(<ComparisonMode onChangeIdea={onChangeIdea} />);
    expect(screen.getByTestId("comparison-panel-left")).toBeInTheDocument();
    expect(screen.getByTestId("comparison-panel-right")).toBeInTheDocument();
  });

  it("renders comparison toolbar", () => {
    render(<ComparisonMode onChangeIdea={onChangeIdea} />);
    expect(screen.getByTestId("comparison-toolbar")).toBeInTheDocument();
  });

  it("renders comparison metrics", () => {
    render(<ComparisonMode onChangeIdea={onChangeIdea} />);
    expect(screen.getByTestId("comparison-metrics")).toBeInTheDocument();
  });

  it("returns null when no ideas are set", () => {
    useComparisonStore.setState({ leftIdea: null, rightIdea: null });
    const { container } = render(
      <ComparisonMode onChangeIdea={onChangeIdea} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders only left panel when right is closed", () => {
    useComparisonStore.setState({ rightIdea: null });
    render(<ComparisonMode onChangeIdea={onChangeIdea} />);
    expect(screen.getByTestId("comparison-panel-left")).toBeInTheDocument();
    expect(
      screen.queryByTestId("comparison-panel-right"),
    ).not.toBeInTheDocument();
  });

  it("swaps ideas when swap button clicked", () => {
    render(<ComparisonMode onChangeIdea={onChangeIdea} />);
    fireEvent.click(screen.getByTestId("swap-ideas-btn"));
    const state = useComparisonStore.getState();
    expect(state.leftIdea?.id).toBe("idea-2");
    expect(state.rightIdea?.id).toBe("idea-1");
  });

  it("exits comparison when exit button clicked", () => {
    render(<ComparisonMode onChangeIdea={onChangeIdea} />);
    fireEvent.click(screen.getByTestId("exit-comparison-btn"));
    const state = useComparisonStore.getState();
    expect(state.isActive).toBe(false);
  });
});
