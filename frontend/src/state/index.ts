import { create } from "zustand";
export * from "./DocumentStore";
export * from "./HomeStore";

export interface ModelMetadata {
  id: string;
  name: string;
  architecture?: string;
  capabilities?: string;
  quality_score?: number;
  speed: string;       // Words per sec
  latency: string;     // Average latency
  context_length?: string;
  memory_usage?: string;
  recommended_use?: string;
  best_doc_type?: string;
  expected_quality?: string;
  accuracy: number;    // 0-100 score
  memory: string;      // VRAM / RAM requirements
  rouge: string;       // ROUGE-1/2/L averages
  bleu: number;        // BLEU score
  bertScore: number;   // BERTScore
  size: string;        // Storage space size
  downloadStatus: "downloaded" | "not_downloaded" | "downloading";
  progress?: number;
  availability: "active" | "inactive" | "offline";
}

export interface UserState {
  user: { email: string; role?: string; is_admin?: boolean } | null;
  token: string | null;
  isAuthenticated: boolean;
  profile: any | null;
  notifications: any[];
  unreadCount: number;
  login: (user: { email: string; role?: string; is_admin?: boolean }, token: string) => void;
  logout: () => void;
  setProfile: (profile: any) => void;
  setNotifications: (notifications: any[]) => void;
  fetchProfile: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

export interface DocumentData {
  id?: string;
  text: string;
  name: string;
  size: string;
  type: string;
  uploadTime: string;
  wordCount: number;
  charCount: number;
}

export interface SummaryData {
  text: string;
  modelId: string;
  inferenceTime: number;
  confidenceScore: number;
  wordCount: number;
  compressionRatio: number;
}

export interface SessionRun {
  inputWords: number;
  inferenceTime: number;
  modelId: string;
}

export interface SessionStats {
  documentsCount: number;
  summariesCount: number;
  totalInferenceTime: number;
  inferenceTimes: number[];
  sessionRuns: SessionRun[];
}

export interface ModelCatalogState {
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  models: ModelMetadata[];
  fetchModels: () => Promise<void>;
  startModelDownload: (id: string) => void;
  currentDocument: DocumentData | null;
  currentSummary: SummaryData | null;
  sessionStats: SessionStats;
  setCurrentDocument: (doc: DocumentData | null) => void;
  setCurrentSummary: (sum: SummaryData | null) => void;
  addSessionSummary: (inferenceTime: number) => void;
  addSessionRun: (run: SessionRun) => void;
  incrementSessionDocuments: () => void;
  workspaceInputText: string;
  workspaceSummaryText: string;
  workspaceKeywords: string[];
  workspaceLanguage: string;
  workspaceInferenceTime: number;
  workspaceWordsSaved: number;
  workspaceTimeSaved: number;
  workspaceCompressionRatio: number;
  workspaceConfidenceScore: number;
  setWorkspaceInputText: (text: string) => void;
  setWorkspaceSummaryText: (text: string) => void;
  setWorkspaceKeywords: (kws: string[]) => void;
  setWorkspaceLanguage: (lang: string) => void;
  setWorkspaceInferenceTime: (val: number) => void;
  setWorkspaceWordsSaved: (val: number) => void;
  setWorkspaceTimeSaved: (val: number) => void;
  setWorkspaceCompressionRatio: (val: number) => void;
  setWorkspaceConfidenceScore: (val: number) => void;
}

const savedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
const savedEmail = typeof window !== "undefined" ? localStorage.getItem("email") : null;

export const useAuthStore = create<UserState>((set) => ({
  user: savedEmail ? { email: savedEmail } : null,
  token: savedToken || null,
  isAuthenticated: !!savedToken,
  profile: null,
  notifications: [],
  unreadCount: 0,
  login: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("email", user.email);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    // Fire and forget backend logout call to clear server session & cookies
    import("../api").then(({ apiClient }) => {
      apiClient.post("/auth/logout").catch(err => console.error("Logout endpoint failed:", err));
    }).catch(e => console.error("Failed to import api client:", e));

    localStorage.removeItem("token");
    localStorage.removeItem("email");
    set({ user: null, token: null, isAuthenticated: false, profile: null, notifications: [], unreadCount: 0 });
  },
  setProfile: (profile) => set({ profile }),
  setNotifications: (notifications) => set({ 
    notifications, 
    unreadCount: notifications.filter((n: any) => !n.is_read).length 
  }),
  fetchProfile: async () => {
    try {
      const { apiClient } = await import("../api");
      const res = await apiClient.get("/auth/profile/full");
      set({ profile: res.data });
    } catch (e) {
      console.error("Failed to fetch profile in store", e);
    }
  },
  fetchNotifications: async () => {
    try {
      const { apiClient } = await import("../api");
      const res = await apiClient.get("/notifications/");
      const notifs = res.data.notifications || [];
      set({ 
        notifications: notifs,
        unreadCount: notifs.filter((n: any) => !n.is_read).length
      });
    } catch (e) {
      console.error("Failed to fetch notifications in store", e);
    }
  }
}));

export const useModelStore = create<ModelCatalogState>((set, get) => ({
  selectedModelId: "distilbart",
  setSelectedModelId: (id) => set({ selectedModelId: id }),
  currentDocument: null,
  currentSummary: null,
  sessionStats: {
    documentsCount: 0,
    summariesCount: 0,
    totalInferenceTime: 0,
    inferenceTimes: [],
    sessionRuns: []
  },
  setCurrentDocument: (doc) => set({ currentDocument: doc }),
  setCurrentSummary: (sum) => set({ currentSummary: sum }),
  addSessionSummary: (inferenceTime) => set((state) => ({
    sessionStats: {
      ...state.sessionStats,
      summariesCount: state.sessionStats.summariesCount + 1,
      totalInferenceTime: state.sessionStats.totalInferenceTime + inferenceTime,
      inferenceTimes: [...state.sessionStats.inferenceTimes, inferenceTime]
    }
  })),
  addSessionRun: (run) => set((state) => ({
    sessionStats: {
      ...state.sessionStats,
      sessionRuns: [...state.sessionStats.sessionRuns, run]
    }
  })),
  incrementSessionDocuments: () => set((state) => ({
    sessionStats: {
      ...state.sessionStats,
      documentsCount: state.sessionStats.documentsCount + 1
    }
  })),
  workspaceInputText: "",
  workspaceSummaryText: "",
  workspaceKeywords: [],
  workspaceLanguage: "en",
  workspaceInferenceTime: 0,
  workspaceWordsSaved: 0,
  workspaceTimeSaved: 0,
  workspaceCompressionRatio: 0,
  workspaceConfidenceScore: 0,
  setWorkspaceInputText: (text) => set({ workspaceInputText: text }),
  setWorkspaceSummaryText: (text) => set({ workspaceSummaryText: text }),
  setWorkspaceKeywords: (kws) => set({ workspaceKeywords: kws }),
  setWorkspaceLanguage: (lang) => set({ workspaceLanguage: lang }),
  setWorkspaceInferenceTime: (val) => set({ workspaceInferenceTime: val }),
  setWorkspaceWordsSaved: (val) => set({ workspaceWordsSaved: val }),
  setWorkspaceTimeSaved: (val) => set({ workspaceTimeSaved: val }),
  setWorkspaceCompressionRatio: (val) => set({ workspaceCompressionRatio: val }),
  setWorkspaceConfidenceScore: (val) => set({ workspaceConfidenceScore: val }),
  models: [
    {
      id: "t5",
      name: "T5-Base",
      speed: "45 wps",
      accuracy: 85,
      memory: "2.4 GB",
      rouge: "0.42 / 0.19 / 0.38",
      bleu: 34.5,
      bertScore: 0.88,
      latency: "1.2s",
      size: "890 MB",
      downloadStatus: "downloaded",
      availability: "active"
    },
    {
      id: "bart",
      name: "BART-Large-CNN",
      speed: "35 wps",
      accuracy: 89,
      memory: "4.1 GB",
      rouge: "0.45 / 0.22 / 0.41",
      bleu: 37.2,
      bertScore: 0.91,
      latency: "1.8s",
      size: "1.62 GB",
      downloadStatus: "downloaded",
      availability: "active"
    },
    {
      id: "pegasus",
      name: "PEGASUS-Large",
      speed: "18 wps",
      accuracy: 91,
      memory: "5.6 GB",
      rouge: "0.47 / 0.24 / 0.43",
      bleu: 39.0,
      bertScore: 0.93,
      latency: "3.2s",
      size: "2.2 GB",
      downloadStatus: "not_downloaded",
      availability: "inactive"
    },
    {
      id: "distilbart",
      name: "DistilBART-CNN-12-6",
      speed: "85 wps",
      accuracy: 82,
      memory: "1.2 GB",
      rouge: "0.40 / 0.17 / 0.36",
      bleu: 31.8,
      bertScore: 0.86,
      latency: "0.6s",
      size: "450 MB",
      downloadStatus: "downloaded",
      availability: "active"
    },
    {
      id: "flant5",
      name: "FLAN-T5-Large",
      speed: "30 wps",
      accuracy: 88,
      memory: "3.8 GB",
      rouge: "0.44 / 0.21 / 0.40",
      bleu: 36.8,
      bertScore: 0.90,
      latency: "2.1s",
      size: "1.5 GB",
      downloadStatus: "not_downloaded",
      availability: "inactive"
    },
    {
      id: "llama",
      name: "Llama-3-8B-Instruct",
      speed: "12 wps",
      accuracy: 94,
      memory: "16.2 GB",
      rouge: "0.52 / 0.28 / 0.48",
      bleu: 44.5,
      bertScore: 0.96,
      latency: "5.4s",
      size: "4.8 GB",
      downloadStatus: "not_downloaded",
      availability: "inactive"
    },
    {
      id: "gemma",
      name: "Gemma-2B-IT",
      speed: "25 wps",
      accuracy: 86,
      memory: "5.2 GB",
      rouge: "0.43 / 0.20 / 0.39",
      bleu: 35.1,
      bertScore: 0.89,
      latency: "2.8s",
      size: "1.8 GB",
      downloadStatus: "not_downloaded",
      availability: "inactive"
    },
    {
      id: "mistral",
      name: "Mistral-7B-v0.2",
      speed: "15 wps",
      accuracy: 93,
      memory: "14.8 GB",
      rouge: "0.50 / 0.26 / 0.46",
      bleu: 42.8,
      bertScore: 0.95,
      latency: "4.8s",
      size: "4.1 GB",
      downloadStatus: "not_downloaded",
      availability: "inactive"
    },
    {
      id: "phi",
      name: "Phi-3-Mini",
      speed: "28 wps",
      accuracy: 87,
      memory: "7.2 GB",
      rouge: "0.44 / 0.21 / 0.40",
      bleu: 35.8,
      bertScore: 0.90,
      latency: "2.4s",
      size: "2.2 GB",
      downloadStatus: "not_downloaded",
      availability: "inactive"
    }
  ],
  fetchModels: async () => {
    try {
      const { apiClient } = await import("../api");
      const res = await apiClient.get("/models/available");
      if (res.data && res.data.models) {
        set({ models: res.data.models });
      }
    } catch (e) {
      console.error("Failed to fetch models:", e);
    }
  },
  startModelDownload: async (id) => {
    const model = get().models.find(m => m.id === id);
    if (!model || model.downloadStatus !== "not_downloaded") return;

    set(state => ({
      models: state.models.map(m => 
        m.id === id ? { ...m, downloadStatus: "downloading", progress: 0 } : m
      )
    }));

    try {
      const { apiClient } = await import("../api");
      await apiClient.post(`/models/download/${id}`);
      
      set(state => ({
        models: state.models.map(m => 
          m.id === id ? { ...m, downloadStatus: "downloaded", availability: "active", progress: undefined } : m
        )
      }));
    } catch (err) {
      console.error("Model download failed:", err);
      set(state => ({
        models: state.models.map(m => 
          m.id === id ? { ...m, downloadStatus: "not_downloaded", progress: undefined } : m
        )
      }));
    }
  }
}));
