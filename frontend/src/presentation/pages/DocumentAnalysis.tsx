import React, { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { 
  BarChart3, 
  Map, 
  Sparkles,
  FileText,
  Activity,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  SmilePlus,
  Compass,
  List
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useModelStore } from "@/state";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/api";

// Helper function to extract 3 dynamic key takeaways from text based on semantic cues
const extractTakeaways = (text: string): string[] => {
  if (!text) return [];
  // Split into sentences
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 25 && s.length < 160);
  
  const keywords = ["should", "must", "important", "key", "recommend", "need to", "significant", "conclude", "primary", "focus", "essential", "aim", "development"];
  const matches: string[] = [];
  
  for (const sentence of sentences) {
    if (keywords.some(kw => sentence.toLowerCase().includes(kw))) {
      // Avoid duplicate or very similar sentences
      if (!matches.some(m => m.toLowerCase().slice(0, 15) === sentence.toLowerCase().slice(0, 15))) {
        matches.push(sentence);
      }
    }
    if (matches.length >= 3) break;
  }
  
  // Fallback to first 3 sentences if not enough matches
  if (matches.length < 3) {
    const remaining = 3 - matches.length;
    const fallbacks = sentences.filter(s => !matches.includes(s)).slice(0, remaining);
    matches.push(...fallbacks);
  }
  
  return matches.map(s => s.endsWith(".") ? s : s + ".");
};

interface KeywordItem {
  keyword: string;
  frequency: number;
  tfIdfScore: number;
  importanceScore: number;
}

interface AnalysisData {
  document_id: string;
  document_name: string;
  file_type: string;
  upload_date: string;
  last_modified: string;
  file_size: string;
  page_count: number;
  text_statistics: {
    totalCharacters: number;
    charactersWithoutSpaces: number;
    totalWords: number;
    uniqueWords: number;
    vocabularyRichness: number;
    averageWordLength: number;
    longestWord: string;
    shortestWord: string;
    sentenceCount: number;
    averageSentenceLength: number;
    paragraphCount: number;
    averageParagraphLength: number;
    whitespaceCount: number;
    specialCharacterCount: number;
    numberCount: number;
    uppercaseCount: number;
    lowercaseCount: number;
  };
  readability_scores: {
    fleschReadingEase: number;
    fleschKincaidGrade: number;
    gunningFogIndex: number;
    smogIndex: number;
    colemanLiauIndex: number;
    automatedReadabilityIndex: number;
    readingDifficulty: string;
    estimatedEducationLevel: string;
  };
  language_analysis: {
    language: string;
    confidenceScore: number;
    writingStyle: string;
    tone: string;
  };
  keywords: KeywordItem[];
  ner_results: {
    Person: string[];
    Organization: string[];
    Location: string[];
    Date: string[];
    Time: string[];
    Money: string[];
    Email: string[];
    "Phone Number": string[];
    Website: string[];
    Product: string[];
    Technology: string[];
  };
  pos_distribution: {
    Nouns: number;
    Verbs: number;
    Adjectives: number;
    Adverbs: number;
    Pronouns: number;
    Prepositions: number;
    Conjunctions: number;
  };
  sentiment_emotion: {
    sentiment: string;
    confidence: number;
    positive: number;
    negative: number;
    neutral: number;
    emotions: {
      happy: number;
      sad: number;
      angry: number;
      fear: number;
      surprise: number;
    };
  };
  topics: {
    mainTopic: string;
    distribution: {
      topic: string;
      distribution: number;
      importance: string;
      subtopics: string[];
    }[];
  };
  summarization_analysis?: {
    originalLength: number;
    summaryLength: number;
    compressionRatio: number;
    readingTimeSaved: number;
    informationRetention: number;
    summaryQuality: string;
  };
}

export const DocumentAnalysis: React.FC = () => {
  const { currentDocument, setCurrentDocument } = useModelStore();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [takeaways, setTakeaways] = useState<string[]>([]);

  const fetchDocuments = async () => {
    try {
      const res = await apiClient.get('/upload/?page_size=100&sort_by=upload_time&sort_order=desc');
      if (res.data.documents) {
        setDocuments(res.data.documents);
      }
    } catch (e) {
      console.error("Failed to fetch documents list", e);
    }
  };

  const fetchAnalysis = async (forceRefresh = false) => {
    if (!currentDocument) return;
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (forceRefresh) {
        await apiClient.post(`/analysis/${currentDocument.id}/refresh`);
      }
      const response = await apiClient.get(`/analysis/${currentDocument.id}`);
      setAnalysis(response.data);
      
      // Fetch full document details to get text for takeaways extraction
      const docDetails = await apiClient.get(`/upload/document/${currentDocument.id}`);
      if (docDetails.data && docDetails.data.text) {
        setTakeaways(extractTakeaways(docDetails.data.text));
      } else {
        setTakeaways([]);
      }

      if (forceRefresh) {
        success("NLP Analysis successfully refreshed!");
      }
    } catch (error) {
      console.error("Failed to load document analysis:", error);
      toastError("Failed to fetch document analysis.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load document list once on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Sync analysis whenever document changes, or fetch latest document if none selected
  useEffect(() => {
    const initializeDocument = async () => {
      if (currentDocument?.id) {
        fetchAnalysis();
      } else {
        // Fetch the latest document globally
        setLoading(true);
        try {
          const res = await apiClient.get('/upload/?page_size=1&sort_by=upload_time&sort_order=desc');
          if (res.data.documents && res.data.documents.length > 0) {
            setCurrentDocument(res.data.documents[0]);
          }
        } catch (e) {
          console.error("Failed to load latest document fallback", e);
        } finally {
          setLoading(false);
        }
        setAnalysis(null);
      }
    };
    initializeDocument();
  }, [currentDocument?.id]);

  const handleExport = (format: string) => {
    if (!currentDocument) return;
    window.open(`${apiClient.defaults.baseURL}/analysis/${currentDocument.id}/export?format=${format}`, "_blank");
    success(`Downloading report in ${format.toUpperCase()} format.`);
  };

  // Helper to highlight matching queries in text statistics or keywords
  const renderHighlighted = (val: string | number) => {
    const textStr = String(val);
    if (!searchQuery.trim()) return textStr;
    const parts = textStr.split(new RegExp(`(${searchQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")})`, "gi"));
    return (
      <>
        {parts.map((p, idx) => 
          p.toLowerCase() === searchQuery.toLowerCase() 
            ? <mark key={idx} className="bg-yellow-200 text-black px-0.5 rounded font-bold">{p}</mark> 
            : p
        )}
      </>
    );
  };

  if (!currentDocument) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[60vh] select-none text-center">
        <Card className="p-8 max-w-md border border-borderToken bg-surface shadow-md flex flex-col items-center gap-4">
          <div className="bg-primary/10 text-primary p-4 rounded-full animate-bounce">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold font-display text-main">No Active Document</h2>
          <p className="text-xs text-muted leading-relaxed">
            There is currently no active document. Please load or upload a document inside the <strong>Document Library</strong> section to perform dynamic NLP intelligence reports.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-primary animate-spin" />
          <p className="text-xs font-bold text-muted animate-pulse">Running advanced tokenizers and lexicons...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[60vh] text-center">
        <Card className="p-8 max-w-md border border-borderToken bg-surface shadow-md flex flex-col items-center gap-4">
          <ShieldAlert className="w-8 h-8 text-danger" />
          <h2 className="text-lg font-bold font-display text-main">Analysis Failed</h2>
          <p className="text-xs text-muted">Failed to generate NLP statistics for this document.</p>
          <Button onClick={() => fetchAnalysis()} size="sm">Retry Analysis</Button>
        </Card>
      </div>
    );
  }

  // 1. Keyword Frequency Chart (dynamic)
  const keywordChartOptions: ApexOptions = {
    chart: { id: "keyword-bars", toolbar: { show: false }, fontFamily: "Poppins, Inter, sans-serif" },
    colors: ["#5b6bff"],
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "65%",
        borderRadius: 4
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: analysis.keywords.slice(0, 10).map(k => k.keyword),
      labels: { style: { colors: "var(--muted)" } }
    },
    yaxis: { labels: { style: { colors: "var(--muted)" } } },
    tooltip: { theme: "dark" }
  };

  const keywordChartSeries = [
    { name: "Mentions Count", data: analysis.keywords.slice(0, 10).map(k => k.frequency) }
  ];

  // 2. POS Distribution Chart (dynamic)
  const posChartOptions: ApexOptions = {
    chart: { id: "pos-donut", fontFamily: "Poppins, Inter, sans-serif" },
    colors: ["#5b6bff", "#10b981", "#ff4560", "#feb019", "#00e396", "#775dd0", "#546e7a"],
    labels: Object.keys(analysis.pos_distribution),
    stroke: { show: false },
    legend: { position: "bottom", labels: { colors: "var(--muted)" } },
    tooltip: { theme: "dark" }
  };

  const posChartSeries = Object.values(analysis.pos_distribution);

  // 3. Sentiment Pie Chart
  const sentimentChartOptions: ApexOptions = {
    chart: { id: "sentiment-pie", fontFamily: "Poppins, Inter, sans-serif" },
    colors: ["#10b981", "#ff4560", "#feb019"],
    labels: ["Positive", "Negative", "Neutral"],
    stroke: { show: false },
    legend: { position: "bottom", labels: { colors: "var(--muted)" } },
    tooltip: { theme: "dark" }
  };

  const sentimentChartSeries = [
    analysis.sentiment_emotion.positive,
    analysis.sentiment_emotion.negative,
    analysis.sentiment_emotion.neutral
  ];

  // 4. Topic Distribution Horizontal Bars
  const topicChartOptions: ApexOptions = {
    chart: { id: "topic-bars", toolbar: { show: false }, fontFamily: "Poppins, Inter, sans-serif" },
    colors: ["#10b981"],
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "55%",
        borderRadius: 4
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: analysis.topics.distribution.map(t => t.topic),
      labels: { style: { colors: "var(--muted)" } }
    },
    yaxis: { labels: { style: { colors: "var(--muted)" } } },
    tooltip: { theme: "dark" }
  };

  const topicChartSeries = [
    { name: "Relevance Score", data: analysis.topics.distribution.map(t => t.distribution) }
  ];

  // 5. Word Cloud mapping classes
  const wordCloudTags = analysis.keywords.slice(0, 15).map((item, idx) => {
    const classes = [
      "text-2xl font-black text-primary animate-pulse",
      "text-2xl font-extrabold text-indigo-500",
      "text-xl font-bold text-emerald-500",
      "text-xl font-bold text-amber-500",
      "text-lg font-semibold text-pink-500",
      "text-lg font-semibold text-violet-500",
      "text-base font-medium text-cyan-500",
      "text-base font-medium text-main",
      "text-sm font-medium text-muted",
      "text-xs font-medium text-muted/75"
    ];
    return {
      text: item.keyword.toUpperCase(),
      weight: classes[idx % classes.length] || "text-xs text-muted"
    };
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Title & Search exports bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold font-display text-main">Document Intelligence Analysis</h2>
            {refreshing && <RefreshCw className="w-4 h-4 text-primary animate-spin" />}
            
            {/* Dropdown document selector */}
            {documents.length > 0 && (
              <select
                value={currentDocument?.id || ""}
                onChange={(e) => {
                  const selected = documents.find(d => d.id === e.target.value);
                  if (selected) {
                    setCurrentDocument(selected);
                  }
                }}
                className="bg-slate-100 dark:bg-slate-800/40 border border-borderToken rounded-lg px-3 py-1 text-xs text-main font-semibold outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-[200px] truncate"
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id} className="bg-surface text-main">
                    {doc.display_name || doc.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-xs text-muted">
            Advanced NLP linguistics, named entity recognition index, and tokenization distributions metrics.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial md:w-64">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search analysis metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-borderToken rounded-lg pl-8 pr-3 py-1.5 text-xs text-main focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchAnalysis(true)}
            className="text-xs border-borderToken h-8 gap-1.5"
            disabled={refreshing}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>

          {/* Export options */}
          <div className="flex bg-slate-100 dark:bg-slate-800/40 p-0.5 rounded-lg border border-borderToken">
            {["pdf", "csv", "excel", "json", "txt"].map(fmt => (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold text-muted hover:text-main hover:bg-surface/50 transition-all uppercase"
              >
                {fmt === "excel" ? "xls" : fmt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview & Core Diagnostics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Document Overview & Readability Audience */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken lg:col-span-1">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-xs font-display text-main">Document Details</h3>
            </div>
            <Badge variant="primary" className="text-[8px]">ACTIVE</Badge>
          </div>
          <div className="flex flex-col gap-2.5 text-xs leading-relaxed">
            {[
              { label: "Document Name", value: analysis.document_name },
              { label: "File Type", value: analysis.file_type.toUpperCase() },
              { label: "Upload Date", value: new Date(analysis.upload_date).toLocaleDateString() },
              { label: "File Size", value: analysis.file_size },
              { label: "Detected Language", value: analysis.language_analysis.language }
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between border-b border-borderToken/35 pb-1.5">
                <span className="text-muted font-medium">{item.label}</span>
                <span className="text-main font-bold truncate max-w-[140px]" title={String(item.value)}>
                  {renderHighlighted(item.value)}
                </span>
              </div>
            ))}
          </div>

          {/* Readability & Target Audience Meter */}
          <div className="border-t border-borderToken/40 pt-3 mt-1">
            <span className="text-[9px] text-muted font-bold uppercase block mb-1.5">Readability & Difficulty Level</span>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-[10px] font-bold text-main mb-1">
                  <span>{analysis.readability_scores.readingDifficulty}</span>
                  <span>{analysis.readability_scores.fleschReadingEase} / 100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all" 
                    style={{ width: `${analysis.readability_scores.fleschReadingEase}%` }} 
                  />
                </div>
              </div>
            </div>
            <p className="text-[9px] text-muted mt-2 leading-relaxed">
              Target Audience: <strong>{analysis.readability_scores.estimatedEducationLevel}</strong> (based on sentence structure analysis).
            </p>
          </div>
        </Card>

        {/* Text Stats & Summary Diagnostics */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken lg:col-span-2">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-xs font-display text-main">Key Statistics & Summarization Diagnostics</h3>
            </div>
            <span className="text-[9px] text-muted uppercase font-bold">Performance Metrics</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="border-r border-borderToken/30 pr-2">
              <span className="text-muted block">Total Words</span>
              <strong className="block text-main font-bold text-lg mt-0.5">{renderHighlighted(analysis.text_statistics.totalWords)}</strong>
            </div>
            <div className="border-r border-borderToken/30 pr-2">
              <span className="text-muted block">Total Sentences</span>
              <strong className="block text-main font-bold text-lg mt-0.5">{renderHighlighted(analysis.text_statistics.sentenceCount)}</strong>
            </div>
            <div className="border-r border-borderToken/30 pr-2">
              <span className="text-muted block">Read Time (Est)</span>
              <strong className="block text-primary font-bold text-lg mt-0.5">{Math.max(1, Math.round(analysis.text_statistics.totalWords / 200))} min</strong>
            </div>
            <div>
              <span className="text-muted block">Speech Time (Est)</span>
              <strong className="block text-emerald-500 font-bold text-lg mt-0.5">{Math.max(1, Math.round(analysis.text_statistics.totalWords / 130))} min</strong>
            </div>
          </div>

          {analysis.summarization_analysis ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-slate-900/10 border border-borderToken/40 p-4 rounded-xl text-xs mt-2.5">
              <div>
                <span className="text-muted">Original vs Summary Words</span>
                <strong className="block text-main font-bold text-sm mt-0.5">
                  {analysis.text_statistics.totalWords.toLocaleString()} / {Math.round(analysis.summarization_analysis.summaryLength / 6)}
                </strong>
              </div>
              <div>
                <span className="text-muted">Compression Ratio</span>
                <strong className="block text-primary font-bold text-sm mt-0.5">
                  {analysis.summarization_analysis.compressionRatio}%
                </strong>
              </div>
              <div>
                <span className="text-muted">Reading Time Saved</span>
                <strong className="block text-emerald-500 font-bold text-sm mt-0.5">
                  {analysis.summarization_analysis.readingTimeSaved} min
                </strong>
              </div>
              <div>
                <span className="text-muted">Info Retention</span>
                <strong className="block text-amber-500 font-bold text-sm mt-0.5">
                  {analysis.summarization_analysis.informationRetention}%
                </strong>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-borderToken rounded-xl text-xs text-muted mt-2.5">
              Generate a summary in the <strong>Summarizer</strong> page to unlock comparison diagnostics.
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Topics Modelling & Sentiment Emotions Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Topics modelling */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-xs font-display text-main">Topics Modelling Distribution</h3>
            </div>
            <Badge variant="primary" className="text-[9px] font-bold">{analysis.topics.mainTopic}</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-[200px]">
              <ReactApexChart
                options={topicChartOptions}
                series={topicChartSeries}
                type="bar"
                height="100%"
              />
            </div>

            <div className="flex flex-col gap-2.5 text-xs max-h-[220px] overflow-y-auto pr-1">
              <span className="text-[9px] font-bold text-muted uppercase">Extracted Topic Elements</span>
              {analysis.topics.distribution.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1 pb-1.5 border-b border-borderToken/35">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-main">{renderHighlighted(item.topic)}</span>
                    <span className="text-muted">{renderHighlighted(item.distribution)}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {item.subtopics.map((sub, sIdx) => (
                      <span key={sIdx} className="bg-slate-100 dark:bg-slate-800 px-1 rounded-sm text-[8px] text-muted font-semibold">
                        {renderHighlighted(sub)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Sentiment & Emotions Profile */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <SmilePlus className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-xs font-display text-main">Sentiment & Emotions Profile</h3>
            </div>
            <span className="text-[9px] text-muted font-bold">Tone Percentages</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="flex items-center justify-center">
              <ReactApexChart
                options={sentimentChartOptions}
                series={sentimentChartSeries}
                type="pie"
                width={260}
              />
            </div>

            {/* Emotions breakdown */}
            <div className="flex flex-col gap-2.5 text-xs">
              <span className="text-[9px] font-bold text-muted uppercase">Emotion Spectrum Distribution</span>
              {Object.entries(analysis.sentiment_emotion.emotions).map(([emotion, val]) => (
                <div key={emotion} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted capitalize">{emotion}</span>
                    <strong className="text-main">{renderHighlighted(val)}%</strong>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all" 
                      style={{ width: `${val}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3: Key Takeaways & Key Entities Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Key Takeaways Card */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-xs font-display text-main">Key Takeaways & Action Items</h3>
            </div>
            <Badge variant="primary" className="text-[8px]">EXTRACTED</Badge>
          </div>
          <div className="flex flex-col gap-3 text-xs justify-center flex-1 py-1">
            {takeaways.length > 0 ? (
              takeaways.map((takeaway, idx) => (
                <div key={idx} className="flex gap-2.5 items-start leading-relaxed text-main font-medium">
                  <span className="flex items-center justify-center bg-primary/10 text-primary font-bold text-[9px] w-5 h-5 rounded-full shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{renderHighlighted(takeaway)}</span>
                </div>
              ))
            ) : (
              <p className="text-muted italic text-center text-[11px] py-4">No specific key takeaways could be extracted.</p>
            )}
          </div>
        </Card>

        {/* Key Entities Map Card */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-xs font-display text-main">Key References & Mentions</h3>
            </div>
            <span className="text-[9px] text-muted font-bold">NER Mapping</span>
          </div>

          <div className="flex flex-col gap-3.5 text-xs justify-center flex-1">
            {[
              { category: "Important People", list: analysis.ner_results.Person, color: "bg-primary/10 text-primary border-primary/20" },
              { category: "Organizations & Brands", list: analysis.ner_results.Organization, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
              { category: "Locations & Countries", list: analysis.ner_results.Location, color: "bg-pink-500/10 text-pink-500 border-pink-500/20" }
            ].map((ent, idx) => (
              <div key={idx} className="flex flex-col gap-1.5 border-b border-borderToken/25 pb-2.5 last:border-0 last:pb-0">
                <span className="text-[9px] font-bold text-muted uppercase">{ent.category}</span>
                <div className="flex flex-wrap gap-1.5">
                  {ent.list && ent.list.length > 0 ? (
                    ent.list.slice(0, 4).map((item: string, i: number) => (
                      <span key={i} className={`px-2 py-0.5 rounded border text-[9px] font-semibold ${ent.color}`}>
                        {renderHighlighted(item)}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] text-muted italic">None detected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 4: Keywords Bar & Word Cloud */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Keywords chart */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pink-500" />
              <h3 className="font-bold text-xs font-display text-main">Keywords Importance</h3>
            </div>
            <span className="text-[9px] text-muted font-bold">Occurrences Count</span>
          </div>
          <div className="h-[220px]">
            <ReactApexChart
              options={keywordChartOptions}
              series={keywordChartSeries}
              type="bar"
              height="100%"
            />
          </div>
        </Card>

        {/* Word Cloud */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs font-display text-main">Semantic Word Cloud</h3>
            </div>
            <span className="text-[9px] text-muted font-bold">Terms Weight</span>
          </div>
          <div className="flex-1 flex flex-wrap gap-x-3.5 gap-y-2.5 items-center justify-center p-3.5 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-borderToken select-none min-h-[220px]">
            {wordCloudTags.map((tag, idx) => (
              <span 
                key={idx} 
                className={`${tag.weight} cursor-pointer hover:scale-110 hover:text-primary transition-all duration-200`}
              >
                {renderHighlighted(tag.text)}
              </span>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
};

export default DocumentAnalysis;
