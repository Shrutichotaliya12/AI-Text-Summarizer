import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  Cpu, 
  Sparkles, 
  Activity, 
  BookOpen, 
  Clock, 
  FileText, 
  Percent, 
  ShieldAlert,
  Radio,
  Search,
  Trash2,
  Edit3,
  Heart,
  ListRestart,
  ArrowLeftRight,
  X,
  ChevronRight,
  AlertTriangle,
  RotateCw,
  Share2,
  Languages,
  Calendar,
  Zap
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { SmartInput, SummaryOutput } from "@/components";
import { useModelStore } from "@/state";
import { useTranslation } from "@/context/TranslationContext";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/api";

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const { 
    selectedModelId,
    setSelectedModelId,
    models, 
    fetchModels,
    currentDocument, 
    setCurrentDocument, 
    setCurrentSummary, 
    addSessionSummary,
    addSessionRun,
    workspaceInputText: inputText,
    setWorkspaceInputText: setInputText,
    workspaceSummaryText: summaryText,
    setWorkspaceSummaryText: setSummaryText,
    workspaceKeywords: currentKeywords,
    setWorkspaceKeywords: setCurrentKeywords,
    workspaceLanguage: currentLanguage,
    setWorkspaceLanguage: setCurrentLanguage,
    workspaceInferenceTime: inferenceTime,
    setWorkspaceInferenceTime: setInferenceTime,
    workspaceWordsSaved: wordsSaved,
    setWorkspaceWordsSaved: setWordsSaved,
    workspaceTimeSaved: timeSaved,
    setWorkspaceTimeSaved: setTimeSaved,
    workspaceCompressionRatio: compressionRatio,
    setWorkspaceCompressionRatio: setCompressionRatio,
    workspaceConfidenceScore: confidenceScore,
    setWorkspaceConfidenceScore: setConfidenceScore,
  } = useModelStore();

  // Input & Output states
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<"online" | "busy" | "offline">("online");
  const [docsSummarized, setDocsSummarized] = useState(0);

  // Phase 4 New States
  const [activeSummary, setActiveSummary] = useState<any>(null);
  const [previousSummary, setPreviousSummary] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync with uploaded document if available
  useEffect(() => {
    if (currentDocument) {
      setInputText(currentDocument.text);
    }
  }, [currentDocument]);

  // Load latest summary, user history lists and stats on mount
  const loadWorkspace = async () => {
    if (useModelStore.getState().workspaceInputText) {
      fetchHistory();
      return;
    }

    try {
      const latestResponse = await apiClient.get("/summary/latest");
      if (latestResponse.data.status === "success" && latestResponse.data.summary) {
        const s = latestResponse.data.summary;
        setInputText(s.originalText || "");
        setSummaryText(s.summaryText || "");
        setInferenceTime(s.latency || 0);
        setCompressionRatio(s.compression || 0);
        setConfidenceScore(s.confidence || 0);
        setTimeSaved(s.readingTimeSaved || 0);
        setActiveSummary(s);
        setCurrentKeywords(Array.isArray(s.keywords) ? s.keywords : []);
        setCurrentLanguage(s.language || "en");
        
        if (s.modelUsed) {
          setSelectedModelId(s.modelUsed);
        }

        const words = s.originalText ? s.originalText.trim().split(/\s+/).length : 0;
        const sumWords = s.summaryText ? s.summaryText.trim().split(/\s+/).length : 0;
        setWordsSaved(Math.max(0, words - sumWords));
      }
    } catch (error) {
      console.error("Failed to load latest summary:", error);
    }

    try {
      const statsResponse = await apiClient.get("/analytics/stats");
      if (statsResponse.data.metrics) {
        const m = statsResponse.data.metrics;
        setDocsSummarized(m.documents_summarized || 0);
      }
    } catch (error) {
      console.error("Failed to load telemetry stats:", error);
    }

    fetchHistory();
  };

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get("/summary/");
      if (response.data && response.data.summaries) {
        setHistoryList(response.data.summaries);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  useEffect(() => {
    fetchModels();
    loadWorkspace();
  }, []);

  // Set initial status to online and let operations (like loading) manage it
  useEffect(() => {
    setAiStatus(isLoading ? "busy" : "online");
  }, [isLoading]);

  // Handle summarization submission
  const handleSummarize = async () => {
    if (!inputText.trim() || inputText.trim().length < 10) {
      toastError("Text must be at least 10 characters long.");
      return;
    }
    
    setIsLoading(true);
    setAiStatus("busy");
    
    // Save current summary as previous before generating a new one to enable comparisons
    if (summaryText && activeSummary) {
      setPreviousSummary({ ...activeSummary, summaryText });
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await apiClient.post("/summary/summarize", {
        text: inputText,
        model_id: selectedModelId,
        document_id: currentDocument?.id || null
      }, {
        signal: abortControllerRef.current.signal
      });
      
      const { summary, confidence, compression_ratio, latency, id } = response.data;
      
      setSummaryText(summary);
      setInferenceTime(latency);
      setCompressionRatio(compression_ratio);
      setConfidenceScore(confidence);
      
      const inputWords = inputText.trim().split(/\s+/).length;
      const summaryWords = summary.trim().split(/\s+/).length;
      const deltaWords = Math.max(0, inputWords - summaryWords);
      setWordsSaved(deltaWords);
      
      const readSpeedWPM = 200;
      const savedMins = parseFloat((deltaWords / readSpeedWPM).toFixed(1));
      setTimeSaved(savedMins);
      
      setDocsSummarized(prev => prev + 1);

      // Extract keywords from the input text locally
      const extracted = [...new Set(inputText
        .split(/\s+/)
        .map(w => w.toLowerCase().replace(/[^a-zA-Z]/g, ""))
        .filter(w => w.length > 5)
      )].slice(0, 8);
      setCurrentKeywords(extracted);

      // Try to get user settings language
      try {
        const settingsRes = await apiClient.get("/auth/me");
        setCurrentLanguage(settingsRes.data?.language || "en");
      } catch (_) {
        setCurrentLanguage("en");
      }

      const activeRecord = {
        id,
        originalText: inputText,
        summaryText: summary,
        modelUsed: selectedModelId,
        confidence,
        compression: compression_ratio,
        latency,
        readingTimeSaved: savedMins,
        keywords: extracted,
        language: "en",
        createdDate: new Date().toISOString()
      };
      setActiveSummary(activeRecord);
      
      // Save summary state and stats
      setCurrentSummary({
        text: summary,
        modelId: selectedModelId,
        inferenceTime: latency,
        confidenceScore: confidence,
        wordCount: summaryWords,
        compressionRatio: compression_ratio
      });
      addSessionSummary(latency);
      addSessionRun({
        inputWords,
        inferenceTime: latency,
        modelId: selectedModelId
      });
      
      success("Summary Generated Successfully");
      fetchHistory();
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.message === "canceled") {
        return; // Request was aborted, do nothing
      }
      console.error("Failed to summarize text:", error);
      toastError(error?.response?.data?.detail || "Summarization failed. Please try again.");
    } finally {
      setIsLoading(false);
      setAiStatus("online");
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setAiStatus("online");
      success("Summary generation canceled.");
    }
  };

  // Open existing summary from history list – restores ALL session state
  const handleOpenSummary = async (item: any) => {
    setInputText(item.originalText || "");
    setSummaryText(item.summaryText || "");
    setInferenceTime(item.latency || 0);
    setCompressionRatio(item.compression || 0);
    setConfidenceScore(item.confidence || 0);
    setTimeSaved(item.readingTimeSaved || 0);
    setActiveSummary(item);
    setCurrentKeywords(Array.isArray(item.keywords) ? item.keywords : []);
    setCurrentLanguage(item.language || "en");
    
    // Restore selected model
    if (item.modelUsed) {
      setSelectedModelId(item.modelUsed);
    }

    const words = item.originalText ? item.originalText.trim().split(/\s+/).length : 0;
    const sumWords = item.summaryText ? item.summaryText.trim().split(/\s+/).length : 0;
    setWordsSaved(Math.max(0, words - sumWords));

    const savedMins = parseFloat(((Math.max(0, words - sumWords)) / 200).toFixed(1));
    setTimeSaved(savedMins);

    // Load original document if linked
    if (item.document_id) {
      try {
        const docRes = await apiClient.get(`/upload/document/${item.document_id}`);
        if (docRes.data) {
          setCurrentDocument(docRes.data);
        }
      } catch (error) {
        console.error("Failed to load original document for summary:", error);
        setCurrentDocument(null);
      }
    } else {
      setCurrentDocument(null);
    }

    // Restore summary state in store
    setCurrentSummary({
      text: item.summaryText || "",
      modelId: item.modelUsed || "distilbart",
      inferenceTime: item.latency || 0,
      confidenceScore: item.confidence || 0,
      wordCount: sumWords,
      compressionRatio: item.compression || 0
    });

    // Populate performance session runs to restore telemetry charts
    addSessionRun({
      inputWords: words,
      inferenceTime: item.latency || 0,
      modelId: item.modelUsed || "distilbart"
    });

    success(`Restored: ${item.title}`);
    // Scroll to top of workspace smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete summary from list
  const handleDeleteSummary = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this summary?")) return;
    
    try {
      await apiClient.delete(`/summary/${id}`);
      success("Summary deleted successfully.");
      if (activeSummary?.id === id) {
        setSummaryText("");
        setActiveSummary(null);
        setCurrentKeywords([]);
      }
      fetchHistory();
    } catch (error: any) {
      toastError(error?.response?.data?.detail || "Failed to delete summary.");
    }
  };

  // Toggle favorite on summary
  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const response = await apiClient.post(`/summary/${id}/favorite`);
      const { isFavorite } = response.data;
      success(isFavorite ? "Added to Favorites" : "Removed from Favorites");
      
      if (activeSummary?.id === id) {
        setActiveSummary((prev: any) => prev ? { ...prev, isFavorite } : null);
      }
      fetchHistory();
    } catch (error: any) {
      toastError(error?.response?.data?.detail || "Failed to toggle favorite.");
    }
  };

  // Rename summary
  const handleStartRename = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const handleSaveRename = async (id: string) => {
    if (!editingTitle.trim()) return;
    try {
      await apiClient.put(`/summary/edit/${id}`, { title: editingTitle });
      success("Summary renamed successfully.");
      setEditingId(null);
      fetchHistory();
    } catch (error: any) {
      toastError(error?.response?.data?.detail || "Failed to rename summary.");
    }
  };

  const activeModel = models.find(m => m.id === selectedModelId) || models.find(m => m.id === "distilbart") || models[0];
  const filteredHistory = historyList.filter(item => 
    item.title?.toLowerCase().includes(historySearch.toLowerCase()) ||
    item.summaryText?.toLowerCase().includes(historySearch.toLowerCase())
  );

  const inputWordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. Hero Card Banner */}
      <Card className="bg-gradient-to-r from-primary via-indigo-600 to-brand-700 text-white relative overflow-hidden p-6 md:p-8 flex items-center justify-between shadow-premium border-transparent transition-all">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
        
        <div className="relative flex flex-col gap-2 z-10 max-w-lg">
          <Badge variant="primary" className="bg-white/20 text-white border-transparent w-fit mb-1 font-display">
            {t("brand_tagline")}
          </Badge>
          <h2 className="font-extrabold text-2xl md:text-3xl tracking-tight leading-tight font-display">
            AI Summarization Workspace
          </h2>
          <p className="text-white/80 text-xs md:text-sm font-medium leading-relaxed">
            Choose your transformer model, paste your document text, and generate lightning-fast extractive or abstractive summaries with live NLP telemetry.
          </p>
        </div>

        <div className="hidden md:block relative w-48 h-32 shrink-0">
          <svg className="w-full h-full text-white/30" viewBox="0 0 200 120">
            <motion.path
              d="M10,60 C40,20 60,100 90,60 C120,20 140,100 190,60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              animate={{ pathLength: [0, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            />
            <motion.circle
              cx="50" cy="40" r="4"
              className="fill-white"
              animate={{ y: [0, -12, 0], x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
            <motion.circle
              cx="130" cy="80" r="3"
              className="fill-white"
              animate={{ y: [0, 10, 0], x: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            />
          </svg>
        </div>
      </Card>

      {/* 2. Live Telemetry Panel (8 Stats Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card hoverGlow className="p-3 flex items-center justify-between bg-surface">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{t("home_stat_ai_status")}</span>
            <span className="text-sm font-bold text-main font-display flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
              {isLoading ? t("home_stat_running") : aiStatus === "online" ? t("home_stat_ready") : t("home_stat_busy")}
            </span>
          </div>
          <StatusIndicator status={aiStatus} label="" />
        </Card>

        <Card hoverGlow className="p-3 flex items-center justify-between bg-surface">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{t("home_stat_inference")}</span>
            <span className="text-sm font-bold text-main font-display">
              {isLoading ? "Running..." : inferenceTime > 0 ? `${inferenceTime}s` : "0.00s"}
            </span>
          </div>
          <Activity className="w-5 h-5 text-indigo-500" />
        </Card>

        <Card hoverGlow className="p-3 flex items-center justify-between bg-surface">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{t("home_stat_words_saved")}</span>
            <span className="text-sm font-bold text-main font-display">
              {wordsSaved.toLocaleString()}
            </span>
          </div>
          <BookOpen className="w-5 h-5 text-emerald-500" />
        </Card>

        <Card hoverGlow className="p-3 flex items-center justify-between bg-surface">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{t("home_stat_time_saved")}</span>
            <span className="text-sm font-bold text-main font-display">
              {timeSaved} {t("home_stat_mins")}
            </span>
          </div>
          <Clock className="w-5 h-5 text-amber-500" />
        </Card>

        <Card hoverGlow className="p-3 flex items-center justify-between bg-surface">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Compression</span>
            <span className="text-sm font-bold text-main font-display">
              {compressionRatio > 0 ? `${compressionRatio}%` : "—"}
            </span>
          </div>
          <Percent className="w-5 h-5 text-violet-500" />
        </Card>

        <Card hoverGlow className="p-3 flex items-center justify-between bg-surface">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Confidence</span>
            <span className="text-sm font-bold text-main font-display">
              {confidenceScore > 0 ? `${Math.round(confidenceScore)}%` : "—"}
            </span>
          </div>
          <Sparkles className="w-5 h-5 text-rose-500" />
        </Card>

        <Card hoverGlow className="p-3 flex items-center justify-between bg-surface">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Model Used</span>
            <span className="text-sm font-bold text-main font-display truncate max-w-[100px]">
              {activeSummary?.modelUsed
                ? (models.find(m => m.id === activeSummary.modelUsed)?.name || activeSummary.modelUsed)
                : (activeModel?.name || "—")}
            </span>
          </div>
          <Cpu className="w-5 h-5 text-cyan-500" />
        </Card>

        <Card hoverGlow className="p-3 flex items-center justify-between bg-surface">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Generated</span>
            <span className="text-sm font-bold text-main font-display">
              {activeSummary?.createdDate
                ? new Date(activeSummary.createdDate).toLocaleDateString()
                : "—"}
            </span>
          </div>
          <Calendar className="w-5 h-5 text-teal-500" />
        </Card>
      </div>

      {/* 3. Detailed Model Selector & Specs Panel */}
      <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-borderToken/50">
          <div>
            <h3 className="font-bold text-sm text-main font-display flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" /> Transformer Model Selection
            </h3>
            <p className="text-[10px] text-muted">Select an active neural network to perform text summaries</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {models
              .filter(m => m.downloadStatus === "downloaded" && m.availability === "active")
              .map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModelId(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selectedModelId === m.id
                      ? "bg-primary text-white border-transparent shadow-sm"
                      : "bg-app border-borderToken text-muted hover:text-main"
                  }`}
                >
                  {m.name}
                </button>
              ))}
          </div>
        </div>

        {/* Model specs detailed info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <div><span className="text-[10px] text-muted font-semibold">Architecture:</span> <span className="font-bold text-main">{activeModel?.architecture || "Encoder-Decoder (Transformer)"}</span></div>
              <div><span className="text-[10px] text-muted font-semibold">Context Length:</span> <span className="font-bold text-main">{activeModel?.context_length || "1024 tokens"}</span></div>
              <div><span className="text-[10px] text-muted font-semibold">Memory Usage:</span> <span className="font-bold text-main">{activeModel?.memory_usage || activeModel?.memory || "N/A"}</span></div>
            </div>
            <div className="mt-1">
              <span className="text-[10px] text-muted font-semibold">Model Capabilities:</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">{activeModel?.capabilities || "Dynamic text summarization and content condensation."}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px]">
              <div><span className="text-muted">Best Document Type:</span> <strong className="text-main">{activeModel?.best_doc_type || "News & Reports"}</strong></div>
              <div><span className="text-muted">Expected Quality:</span> <strong className="text-main">{activeModel?.expected_quality || "High"}</strong></div>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-primary font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended use: {activeModel?.recommended_use || "General text summarization tasks"}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/10 p-3 rounded-lg border border-borderToken/30 text-[10px]">
            <div className="flex flex-col">
              <span className="text-muted">Inference Speed</span>
              <strong className="text-main mt-0.5">{activeModel?.speed || "N/A"}</strong>
            </div>
            <div className="flex flex-col">
              <span className="text-muted">Estimated Latency</span>
              <strong className="text-main mt-0.5">{activeModel?.latency || "N/A"}</strong>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-muted">Quality Rating</span>
              <div className="flex items-center gap-2 mt-1">
                <ProgressBar progress={activeModel?.quality_score || activeModel?.accuracy || 80} className="h-1.5 flex-1" />
                <strong className="text-main font-bold shrink-0">{activeModel?.quality_score || activeModel?.accuracy || 80}%</strong>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Main Workspace (Split Input / Outputs) – items-start prevents height coupling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Left Card: Input Workspace – NO h-full so it doesn't stretch with right panel */}
        <Card className="flex flex-col gap-4 bg-surface">
          <div className="flex justify-between items-center border-b border-borderToken/60 pb-2">
            <div>
              <h3 className="font-bold text-sm font-display text-main">Source Document Text</h3>
              <p className="text-[10px] text-muted">
                {inputWordCount > 0 ? `${inputWordCount.toLocaleString()} words` : "Input target characters below"}
              </p>
            </div>
            <FileText className="w-4 h-4 text-muted" />
          </div>

          <SmartInput
            value={inputText}
            onChange={setInputText}
            onSubmit={handleSummarize}
            maxLength={3000}
            disabled={isLoading}
            placeholder="Type, paste, or drag and drop your text document here (minimum 10 characters)..."
          />

          <div className="flex justify-between items-center mt-2">
            {isLoading ? (
              <Button 
                variant="outline" 
                onClick={handleCancelGeneration}
                className="text-xs gap-1.5 border-danger/30 text-danger hover:bg-danger/5"
              >
                <X className="w-3.5 h-3.5" /> Cancel Generation
              </Button>
            ) : (
              <div />
            )}
            
            <Button
              onClick={handleSummarize}
              disabled={isLoading || !inputText.trim()}
              isLoading={isLoading}
              className="gap-2"
            >
              Generate Summary <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>

        {/* Right Card: Output Workspace – also NO h-full, expands independently */}
        <Card className="flex flex-col gap-4 bg-surface">
          {isComparing && previousSummary ? (
            // Comparison layout
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-borderToken pb-2">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-primary" />
                  <div>
                    <h3 className="font-bold text-sm font-display text-main">Version Comparison</h3>
                    <p className="text-[10px] text-muted">Comparing current summary with previous run</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsComparing(false)}
                  className="text-[10px] py-1 h-7 border-borderToken"
                >
                  Exit Compare
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Column 1: Current Summary */}
                <div className="flex flex-col gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex justify-between items-center text-[10px] pb-1 border-b border-borderToken/45">
                    <span className="font-bold text-primary">Current Version</span>
                    <Badge variant="primary" className="text-[8px] py-0">{activeSummary?.modelUsed || selectedModelId}</Badge>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-main overflow-y-auto max-h-[300px] text-[11px] leading-relaxed">
                    {summaryText}
                  </div>
                </div>

                {/* Column 2: Previous Summary */}
                <div className="flex flex-col gap-2 p-3 rounded-lg border border-borderToken bg-slate-50 dark:bg-slate-800/10">
                  <div className="flex justify-between items-center text-[10px] pb-1 border-b border-borderToken/45">
                    <span className="font-bold text-muted">Previous Version</span>
                    <Badge variant="secondary" className="text-[8px] py-0">{previousSummary.modelUsed}</Badge>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted overflow-y-auto max-h-[300px] text-[11px] leading-relaxed">
                    {previousSummary.summaryText}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Standard single output layout
            <div className="flex flex-col justify-between">
              <SummaryOutput
                summary={summaryText}
                isLoading={isLoading}
                onRegenerate={handleSummarize}
                wordCount={wordsSaved}
                charCount={inputText.length}
                compressionRatio={compressionRatio}
                generationTime={inferenceTime}
                modelUsed={models.find(m => m.id === (activeSummary?.modelUsed || selectedModelId))?.name || selectedModelId}
                language={currentLanguage}
                createdDate={activeSummary?.createdDate}
                isFavorite={activeSummary?.isFavorite}
                onToggleFavorite={activeSummary ? () => handleToggleFavorite(activeSummary.id) : undefined}
                confidenceScore={confidenceScore}
                keywords={currentKeywords}
                readingTimeSaved={timeSaved}
              />
              
              {summaryText && previousSummary && !isLoading && (
                <div className="mt-4 pt-3 border-t border-borderToken/65 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsComparing(true)}
                    className="gap-1.5 text-[10px] border-borderToken font-semibold"
                  >
                    <ArrowLeftRight className="w-3 h-3 text-primary" /> Compare with Previous
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

      </div>

      {/* 5. Summary History Shortcut Panel (Dashboard List) */}
      <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-borderToken/50">
          <div>
            <h3 className="font-bold text-sm text-main font-display flex items-center gap-2">
              <ListRestart className="w-4 h-4 text-primary" /> Recent Summaries
            </h3>
            <p className="text-[10px] text-muted">Restore or manage your previously saved text summarizations</p>
          </div>

          <div className="relative w-full sm:max-w-xs shrink-0">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search history..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full bg-app border border-borderToken rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-main focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* History Listings */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-muted/65 italic text-xs">
            No saved summaries found. Generate summaries above to populate your workspace dashboard.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1">
            {filteredHistory.map((item) => {
              const isEditing = editingId === item.id;
              
              return (
                <div 
                  key={item.id}
                  onClick={() => handleOpenSummary(item)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all duration-300 hover:shadow-premium cursor-pointer select-none bg-surface ${
                    activeSummary?.id === item.id 
                      ? "border-primary/50 ring-1 ring-primary/10" 
                      : "border-borderToken/80 hover:border-borderToken"
                  }`}
                >
                  <div className="flex items-start gap-3 max-w-lg min-w-0">
                    <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${item.isFavorite ? "text-amber-500 fill-amber-500" : "text-muted"}`} />
                    <div className="flex flex-col gap-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <input 
                            type="text"
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                            className="bg-app border border-borderToken rounded px-2 py-0.5 text-xs text-main focus:outline-none"
                            autoFocus
                            onKeyDown={e => e.key === "Enter" && handleSaveRename(item.id)}
                          />
                          <button 
                            onClick={() => handleSaveRename(item.id)}
                            className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded text-[10px] font-bold"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-1 text-muted hover:bg-hover rounded text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <h4 className="font-bold text-xs text-main truncate font-display">{item.title}</h4>
                      )}
                      <p className="text-[10px] text-muted truncate max-w-md">{item.summaryText}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[8px] py-0 font-normal border-transparent">
                          {models.find(m => m.id === item.modelUsed)?.name || item.modelUsed}
                        </Badge>
                        <span className="text-[8px] text-muted">
                          Compression: <strong>{item.compression}%</strong>
                        </span>
                        <span className="text-[8px] text-muted">•</span>
                        <span className="text-[8px] text-muted">
                          Latency: <strong>{item.latency || "0"}s</strong>
                        </span>
                        <span className="text-[8px] text-muted">•</span>
                        <span className="text-[8px] text-muted">
                          {new Date(item.createdDate || item.created_at).toLocaleDateString()}
                        </span>
                        {item.confidence > 0 && (
                          <>
                            <span className="text-[8px] text-muted">•</span>
                            <span className="text-[8px] text-muted">
                              Confidence: <strong>{Math.round(item.confidence)}%</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 sm:mt-0 justify-end">
                    <Tooltip content="Rename title" position="top">
                      <button
                        onClick={(e) => handleStartRename(item, e)}
                        className="p-1.5 rounded hover:bg-hover text-muted hover:text-main transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                    
                    <Tooltip content="Toggle favorite" position="top">
                      <button
                        onClick={(e) => handleToggleFavorite(item.id, e)}
                        className="p-1.5 rounded hover:bg-hover text-muted hover:text-primary transition-colors"
                      >
                        <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-primary text-primary" : ""}`} />
                      </button>
                    </Tooltip>

                    <Tooltip content="Delete summary" position="top">
                      <button
                        onClick={(e) => handleDeleteSummary(item.id, e)}
                        className="p-1.5 rounded hover:bg-danger/10 text-muted hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                    
                    <ChevronRight className="w-4 h-4 text-muted/50 hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

    </div>
  );
};

export default Home;
