// Unit test suite for Zustand store and helpers
import { useModelStore } from "../state";

describe("Zustand Model Store Unit Tests", () => {
  
  beforeEach(() => {
    // Reset selection before each test
    useModelStore.setState({ selectedModelId: "distilbart" });
  });

  test("should initialize with default selected model", () => {
    const state = useModelStore.getState();
    expect(state.selectedModelId).toBe("distilbart");
  });

  test("should allow changing selected model ID", () => {
    const store = useModelStore.getState();
    store.setSelectedModelId("t5");
    
    const updatedState = useModelStore.getState();
    expect(updatedState.selectedModelId).toBe("t5");
  });

  test("should start model download progress ticker", () => {
    const store = useModelStore.getState();
    // T5 starts as downloaded, let's test Pegasus which is not_downloaded
    store.startModelDownload("pegasus");
    
    const updated = useModelStore.getState();
    const pegasus = updated.models.find(m => m.id === "pegasus");
    
    expect(pegasus?.downloadStatus).toBe("downloading");
  });

  test("should ignore downloads for already ready models", () => {
    const store = useModelStore.getState();
    store.startModelDownload("distilbart"); // already downloaded
    
    const updated = useModelStore.getState();
    const distil = updated.models.find(m => m.id === "distilbart");
    expect(distil?.downloadStatus).toBe("downloaded");
  });
});

describe("NLP Utility Helpers Unit Tests", () => {
  const calculateReadingTime = (words: number): number => {
    return Math.max(1, Math.ceil(words / 200));
  };

  test("should calculate correct reading time thresholds", () => {
    expect(calculateReadingTime(150)).toBe(1);
    expect(calculateReadingTime(450)).toBe(3);
    expect(calculateReadingTime(0)).toBe(1);
  });
});
