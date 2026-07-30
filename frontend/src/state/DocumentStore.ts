import { create } from "zustand";
import { apiClient } from "../api";

export interface DocumentData {
  id: string;
  name: string;
  display_name: string;
  size: string;
  type: string;
  wordCount: number;
  charCount: number;
  uploadTime: string;
  lastModified: string;
  status: string;
  tags: string[];
  notes: string;
  pageCount: number;
  isFavorite: boolean;
  text?: string;
}

interface DocumentStore {
  documents: DocumentData[];
  totalDocuments: number;
  isLoading: boolean;
  error: string | null;
  fetchDocuments: (search?: string, filterType?: string, page?: number, pageSize?: number, sortBy?: string, sortOrder?: string) => Promise<void>;
  addDocument: (doc: DocumentData) => void;
  removeDocument: (docId: string) => void;
  updateDocument: (docId: string, updates: Partial<DocumentData>) => void;
  setDocuments: (docs: DocumentData[]) => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  totalDocuments: 0,
  isLoading: false,
  error: null,
  
  fetchDocuments: async (search = "", filterType = "", page = 1, pageSize = 12, sortBy = "upload_time", sortOrder = "desc") => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterType && filterType !== "all") params.append("filter_type", filterType);
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());
      if (sortBy) params.append("sort_by", sortBy);
      if (sortOrder) params.append("sort_order", sortOrder);
      
      const res = await apiClient.get(`/upload/?${params.toString()}`);
      set({ 
        documents: res.data.documents || [], 
        totalDocuments: res.data.total_count || 0,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || "Failed to fetch documents", 
        isLoading: false 
      });
    }
  },
  
  addDocument: (doc) => set((state) => ({ 
    documents: [doc, ...state.documents],
    totalDocuments: state.totalDocuments + 1
  })),
  
  removeDocument: (docId) => set((state) => ({
    documents: state.documents.filter(d => d.id !== docId),
    totalDocuments: Math.max(0, state.totalDocuments - 1)
  })),

  updateDocument: (docId, updates) => set((state) => ({
    documents: state.documents.map(d => d.id === docId ? { ...d, ...updates } : d)
  })),

  setDocuments: (docs) => set({ documents: docs })
}));
