import { create } from "zustand";

export interface SummaryResult {
  text: string;
  inferenceTime: number;
  wordCount: number;
  compressionRatio: number;
  confidenceScore: number;
  modelId: string;
}

export interface HomeStore {
  sourceDocument: any | null;
  setSourceDocument: (doc: any) => void;
  
  generatedSummary: SummaryResult | null;
  setGeneratedSummary: (summary: SummaryResult | null) => void;
  
  parameters: {
    length: [number, number];
    format: string;
    creativity: number;
  };
  setParameters: (params: any) => void;
  
  keywords: string[];
  setKeywords: (keywords: string[]) => void;
  
  actionItems: string[];
  setActionItems: (items: string[]) => void;
  
  clearWorkspace: () => void;
}

export const useHomeStore = create<HomeStore>((set) => ({
  sourceDocument: null,
  setSourceDocument: (doc) => set({ sourceDocument: doc }),
  
  generatedSummary: null,
  setGeneratedSummary: (summary) => set({ generatedSummary: summary }),
  
  parameters: {
    length: [50, 200],
    format: "paragraph",
    creativity: 0.5
  },
  setParameters: (params) => set({ parameters: params }),
  
  keywords: [],
  setKeywords: (keywords) => set({ keywords }),
  
  actionItems: [],
  setActionItems: (items) => set({ actionItems: items }),
  
  clearWorkspace: () => set({
    sourceDocument: null,
    generatedSummary: null,
    keywords: [],
    actionItems: [],
    parameters: { length: [50, 200], format: "paragraph", creativity: 0.5 }
  })
}));
