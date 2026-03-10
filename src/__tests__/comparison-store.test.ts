import { useComparisonStore } from "@/stores/comparison-store";
import { mockIdeaA, mockIdeaB, createMockIdea } from "./fixtures";

describe("useComparisonStore", () => {
  beforeEach(() => {
    useComparisonStore.setState({
      isActive: false,
      leftIdea: null,
      rightIdea: null,
    });
  });

  it("starts in inactive state with no ideas", () => {
    const state = useComparisonStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.leftIdea).toBeNull();
    expect(state.rightIdea).toBeNull();
  });

  it("enterComparison sets both ideas and activates", () => {
    useComparisonStore.getState().enterComparison(mockIdeaA, mockIdeaB);
    const state = useComparisonStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.leftIdea?.id).toBe("idea-1");
    expect(state.rightIdea?.id).toBe("idea-2");
  });

  it("exitComparison clears everything", () => {
    useComparisonStore.getState().enterComparison(mockIdeaA, mockIdeaB);
    useComparisonStore.getState().exitComparison();
    const state = useComparisonStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.leftIdea).toBeNull();
    expect(state.rightIdea).toBeNull();
  });

  it("swapIdeas exchanges left and right", () => {
    useComparisonStore.getState().enterComparison(mockIdeaA, mockIdeaB);
    useComparisonStore.getState().swapIdeas();
    const state = useComparisonStore.getState();
    expect(state.leftIdea?.id).toBe("idea-2");
    expect(state.rightIdea?.id).toBe("idea-1");
  });

  it("replaceIdea replaces the left idea", () => {
    useComparisonStore.getState().enterComparison(mockIdeaA, mockIdeaB);
    const newIdea = createMockIdea({ id: "idea-3", title: "New Idea" });
    useComparisonStore.getState().replaceIdea("left", newIdea);
    const state = useComparisonStore.getState();
    expect(state.leftIdea?.id).toBe("idea-3");
    expect(state.rightIdea?.id).toBe("idea-2");
  });

  it("replaceIdea replaces the right idea", () => {
    useComparisonStore.getState().enterComparison(mockIdeaA, mockIdeaB);
    const newIdea = createMockIdea({ id: "idea-3", title: "New Idea" });
    useComparisonStore.getState().replaceIdea("right", newIdea);
    const state = useComparisonStore.getState();
    expect(state.leftIdea?.id).toBe("idea-1");
    expect(state.rightIdea?.id).toBe("idea-3");
  });

  it("closePanel left keeps right and stays active", () => {
    useComparisonStore.getState().enterComparison(mockIdeaA, mockIdeaB);
    useComparisonStore.getState().closePanel("left");
    const state = useComparisonStore.getState();
    expect(state.leftIdea).toBeNull();
    expect(state.rightIdea?.id).toBe("idea-2");
    expect(state.isActive).toBe(true);
  });

  it("closePanel right keeps left and stays active", () => {
    useComparisonStore.getState().enterComparison(mockIdeaA, mockIdeaB);
    useComparisonStore.getState().closePanel("right");
    const state = useComparisonStore.getState();
    expect(state.leftIdea?.id).toBe("idea-1");
    expect(state.rightIdea).toBeNull();
    expect(state.isActive).toBe(true);
  });

  it("closePanel deactivates when both panels are closed", () => {
    useComparisonStore.getState().enterComparison(mockIdeaA, mockIdeaB);
    useComparisonStore.getState().closePanel("left");
    useComparisonStore.getState().closePanel("right");
    const state = useComparisonStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.leftIdea).toBeNull();
    expect(state.rightIdea).toBeNull();
  });
});
