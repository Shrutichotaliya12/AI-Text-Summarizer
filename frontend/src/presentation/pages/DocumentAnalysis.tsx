import React, { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { 
  BarChart3, 
  Map, 
  Grid, 
  PieChart, 
  Compass, 
  CalendarDays, 
  Award,
  Sparkles,
  GitMerge,
  FileText,
  Activity,
  List,
  RefreshCw,
  Search,
  Download,
  ShieldAlert,
  BrainCircuit,
  Scale,
  TrendingUp,
  SmilePlus,
  FileDown
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useModelStore } from "@/state";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/api";

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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-display text-main">Document Intelligence Analysis</h2>
            {refreshing && <RefreshCw className="w-4 h-4 text-primary animate-spin" />}
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

      {/* Row 1: Document Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken lg:col-span-1">
          <div className="flex justify-between items-center border-b border-borderTokenpb-2 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-xs font-display text-main">Overview Catalog</h3>
            </div>
            <Badge variant="primary" className="text-[8px]">ACTIVE</Badge>
          </div>
          <div className="flex flex-col gap-2.5 text-xs leading-relaxed">
            {[
              { label: "Document Name", value: analysis.document_name },
              { label: "File Type", value: analysis.file_type.toUpperCase() },
              { label: "Upload Date", value: new Date(analysis.upload_date).toLocaleDateString() },
              { label: "Last Modified", value: new Date(analysis.last_modified).toLocaleDateString() },
              { label: "File Size", value: analysis.file_size },
              { label: "Total Pages", value: analysis.page_count },
              { label: "Estimated Read Time", value: `${Math.max(1, Math.round(analysis.text_statistics.totalWords / 200))} min` },
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
        </Card>

        {/* Text Statistics block */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken lg:col-span-2">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-xs font-display text-main">Calculated Text Statistics</h3>
            </div>
            <span className="text-[9px] text-muted uppercase font-bold">Linguistic Index</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3.5 text-xs leading-relaxed max-h-[300px] overflow-y-auto pr-1">
            {[
              { label: "Total Characters", value: analysis.text_statistics.totalCharacters },
              { label: "Chars (No Spaces)", value: analysis.text_statistics.charactersWithoutSpaces },
              { label: "Total Words", value: analysis.text_statistics.totalWords },
              { label: "Unique Words", value: analysis.text_statistics.uniqueWords },
              { label: "Vocabulary Richness", value: analysis.text_statistics.vocabularyRichness },
              { label: "Avg Word Length", value: `${analysis.text_statistics.averageWordLength} chars` },
              { label: "Sentence Count", value: analysis.text_statistics.sentenceCount },
              { label: "Avg Sentence Length", value: `${analysis.text_statistics.averageSentenceLength} words` },
              { label: "Paragraph Count", value: analysis.text_statistics.paragraphCount },
              { label: "Avg Paragraph Length", value: `${analysis.text_statistics.averageParagraphLength} words` },
              { label: "Special Characters", value: analysis.text_statistics.specialCharacterCount },
              { label: "Numbers Count", value: analysis.text_statistics.numberCount }
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between border-b border-borderToken/30 pb-1">
                <span className="text-muted font-medium">{item.label}</span>
                <span className="text-main font-bold">{renderHighlighted(item.value)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 border-t border-borderToken/40 pt-3.5 text-[9px] text-muted">
            <div className="flex-1 min-w-[120px]">
              <strong>Longest Word:</strong>
              <p className="text-main font-semibold mt-0.5 truncate max-w-[200px]" title={analysis.text_statistics.longestWord}>
                {renderHighlighted(analysis.text_statistics.longestWord)}
              </p>
            </div>
            <div className="flex-1 min-w-[120px]">
              <strong>Shortest Word:</strong>
              <p className="text-main font-semibold mt-0.5 truncate" title={analysis.text_statistics.shortestWord}>
                {renderHighlighted(analysis.text_statistics.shortestWord)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Readability Scores & Named Entity Recognition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-xs font-display text-main">Readability & Difficulty Indices</h3>
            </div>
            <span className="text-[8px] bg-indigo-500/10 text-indigo-500 font-bold px-1.5 py-0.5 rounded">FORMULAS</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
            {[
              { label: "Flesch Reading Ease", value: analysis.readability_scores.fleschReadingEase, desc: "Higher is easier (0-100)" },
              { label: "Flesch-Kincaid Grade", value: analysis.readability_scores.fleschKincaidGrade, desc: "Approximate school grade" },
              { label: "Gunning Fog Index", value: analysis.readability_scores.gunningFogIndex, desc: "Syllables/sentence complexity" },
              { label: "SMOG Readability", value: analysis.readability_scores.smogIndex, desc: "Polysyllabic word index" },
              { label: "Coleman-Liau Index", value: analysis.readability_scores.colemanLiauIndex, desc: "Characters counts formula" },
              { label: "Automated Readability (ARI)", value: analysis.readability_scores.automatedReadabilityIndex, desc: "Word size grade formula" }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col border-b border-borderToken/35 pb-1">
                <div className="flex justify-between">
                  <span className="text-muted font-medium">{item.label}</span>
                  <strong className="text-main">{renderHighlighted(item.value)}</strong>
                </div>
                <span className="text-[8px] text-muted mt-0.5">{item.desc}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-800/10 border border-borderToken/40 p-3 rounded-lg text-xs mt-2.5">
            <div>
              <span className="text-[9px] text-muted">Reading Difficulty</span>
              <strong className="block text-primary font-bold text-sm mt-0.5">{renderHighlighted(analysis.readability_scores.readingDifficulty)}</strong>
            </div>
            <div>
              <span className="text-[9px] text-muted">Estimated Education Level</span>
              <strong className="block text-emerald-500 font-bold text-sm mt-0.5">{renderHighlighted(analysis.readability_scores.estimatedEducationLevel)}</strong>
            </div>
          </div>
        </Card>

        {/* Named Entity Recognition (NER) results block */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs font-display text-main">Named Entity Recognition (NER) Index</h3>
            </div>
            <span className="text-[9px] text-muted font-bold">Classified Categories</span>
          </div>

          <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto pr-1">
            {Object.entries(analysis.ner_results).map(([cat, list]) => (
              <div key={cat} className="flex flex-col gap-1 pb-2 border-b border-borderToken/30">
                <span className="text-[10px] font-bold text-muted uppercase">{cat} ({list.length})</span>
                <div className="flex flex-wrap gap-1">
                  {list.length === 0 ? (
                    <span className="text-[9px] text-muted italic">None detected</span>
                  ) : (
                    list.map((ent, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[9px] py-0 border-transparent max-w-[150px] truncate select-all">
                        {renderHighlighted(ent)}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: Keyword Bars Chart & POS Distribution & Word Cloud */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken lg:col-span-1">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-500" />
              <h3 className="font-bold text-xs font-display text-main">Part of Speech (POS)</h3>
            </div>
            <span className="text-[9px] text-muted font-bold">Ratios (%)</span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[220px]">
            <ReactApexChart
              options={posChartOptions}
              series={posChartSeries}
              type="donut"
              width="100%"
            />
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken lg:col-span-1">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pink-500" />
              <h3 className="font-bold text-xs font-display text-main">Keywords Importance</h3>
            </div>
            <span className="text-[9px] text-muted font-bold">Occurrences Count</span>
          </div>
          <div className="h-[240px]">
            <ReactApexChart
              options={keywordChartOptions}
              series={keywordChartSeries}
              type="bar"
              height="100%"
            />
          </div>
        </Card>

        {/* Word Cloud */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken lg:col-span-1">
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

      {/* Row 4: Sentiment Profile & Topics Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
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
                width="100%"
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

        {/* Topics modeling */}
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-xs font-display text-main">Topics Modelling Distribution</h3>
            </div>
            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{analysis.topics.mainTopic}</span>
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
      </div>

      {/* Row 5: Summarization comparison diagnostics (if available) */}
      {analysis.summarization_analysis && (
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-xs font-display text-main">Summarization Metrics & Saved Diagnostics</h3>
            </div>
            <span className="text-[9px] text-muted font-bold">RAG COMPARISON</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted">Original vs Summary Char length</span>
              <strong className="block text-main font-bold text-sm mt-0.5">
                {analysis.summarization_analysis.originalLength.toLocaleString()} / {analysis.summarization_analysis.summaryLength.toLocaleString()}
              </strong>
            </div>
            <div>
              <span className="text-muted">Compression Percentage</span>
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
              <span className="text-muted">Linguistic Info Retention</span>
              <strong className="block text-amber-500 font-bold text-sm mt-0.5">
                {analysis.summarization_analysis.informationRetention}%
              </strong>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
};

export default DocumentAnalysis;
