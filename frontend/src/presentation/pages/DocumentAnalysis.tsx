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
  List,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  Send,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  Mic,
  Globe,
  FileBadge,
  Download,
  Check
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AIResponseRenderer } from "@/components/ui/AIResponseRenderer";
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
  pages?: number[];
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
    ocrRequired?: boolean;
    extractionSuccessful?: boolean;
    pagesProcessed?: number;
    documentType?: string;
    overview?: string;
    structure?: {section: string, level: string, start_page: number, end_page: number, description: string}[];
    takeaways?: {text: string, page: number}[];
    facts?: {type: string, value: string, context: string, page: number}[];
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
  };
  keywords: KeywordItem[];
  ner_results: Record<string, {entity: string, count: number, pages: number[]}[]>;
  pos_distribution: Record<string, number>;
  sentiment_emotion: {
    sentiment: string;
    tone: string;
    writingStyle: string;
    complexity?: string;
    objectivity?: string;
  };
  topics: {
    mainTopic: string;
    distribution: {
      topic: string;
      distribution: number;
      importance: string;
      subtopics: string[];
      count?: number;
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

const SkeletonLoader = () => (
  <div className="flex flex-col gap-6 animate-pulse">
    <div className="flex justify-between items-center mb-2">
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-64"></div>
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-48"></div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl lg:col-span-5"></div>
      <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl lg:col-span-7"></div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl lg:col-span-1"></div>
      <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl lg:col-span-2"></div>
    </div>
  </div>
);

export const DocumentAnalysis: React.FC = () => {
  const { currentDocument, setCurrentDocument } = useModelStore();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  
  const [showFullOverview, setShowFullOverview] = useState(false);

  const [viewerPage, setViewerPage] = useState<number | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  
  const [qaQuery, setQaQuery] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<{q: string, a: string, sources: number[]}[]>([]);
  
  const [searchResults, setSearchResults] = useState<{page: number, text: string, score: number}[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const stats = analysis?.text_statistics || {};
  const tone = analysis?.sentiment_emotion || {};
  const entities = analysis?.ner_results || {};
  const displayOverview = analysis?.text_statistics?.overview;
  const isOverviewLong = displayOverview && displayOverview.length > 300;
  
  const conceptsCategories = analysis?.keywords.slice(0, 8).map(k => k.keyword) || [];
  const conceptsSeries = [{ data: analysis?.keywords.slice(0, 8).map(k => k.frequency) || [] }];
  
  const topicsSeriesLabels = analysis?.topics.distribution.map(d => d.topic) || [];
  const topicsSeries = analysis?.topics.distribution.map(d => d.distribution) || [];

  const posLabels = Object.keys(analysis?.pos_distribution || {});
  const posSeries = Object.values(analysis?.pos_distribution || {});

  const conceptsChartOptions: ApexOptions = {
    chart: { 
      type: 'bar', 
      toolbar: { show: false }, 
      background: 'transparent',
      animations: { enabled: true, easing: 'easeinout', speed: 800 }
    },
    theme: { mode: 'light' },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } }
    },
    dataLabels: { enabled: true, offsetX: 20, style: { fontSize: '10px', colors: ['inherit'] }, formatter: (val) => val.toString() },
    xaxis: { categories: conceptsCategories, labels: { style: { colors: 'inherit' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: 'inherit', fontWeight: 'bold' } } },
    grid: { borderColor: 'rgba(0,0,0,0.05)', strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    colors: ['#6366f1'],
    tooltip: { theme: 'light' }
  };

  const topicsChartOptions: ApexOptions = {
    chart: { 
      type: 'donut', 
      background: 'transparent',
      animations: { enabled: true, easing: 'easeinout', speed: 800 }
    },
    theme: { mode: 'light' },
    labels: topicsSeriesLabels,
    legend: { position: 'bottom', labels: { colors: 'inherit' } },
    stroke: { width: 0 },
    dataLabels: { enabled: true, formatter: function(val) { return Math.round(val) + "%"; } },
    tooltip: { theme: 'light' }
  };

  const renderHighlighted = (text: string) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? <span key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</span> : part
    );
  };

  const handleExport = async (fmt: string) => {
    if (!currentDocument) return;
    setExportLoading(true);
    try {
      const res = await apiClient.get(`/analysis/${currentDocument.id}/export?format=${fmt}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Analysis_Report_${currentDocument.name}.${fmt === 'excel' ? 'xlsx' : fmt}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportDropdownOpen(false);
      success(`Report exported as ${fmt.toUpperCase()}`);
    } catch (e) {
      toastError("Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const handleViewSource = async (page: number) => {
    if (!currentDocument) return;
    setViewerPage(page);
    if (!viewerUrl) {
      try {
        const res = await apiClient.get(`/upload/document/${currentDocument.id}/raw`, { responseType: 'blob' });
        let url;
        if (currentDocument.type === 'pdf') {
          url = URL.createObjectURL(res.data);
        } else {
          // For non-pdfs, load as text/plain so browser handles it gracefully in iframe
          url = URL.createObjectURL(new Blob([res.data], { type: 'text/plain' }));
        }
        setViewerUrl(url);
      } catch (e) {
        toastError("Failed to load document viewer");
      }
    }
  };

  const handleAsk = async () => {
    if (!qaQuery.trim() || !currentDocument) return;
    setQaLoading(true);
    try {
      const res = await apiClient.post(`/analysis/${currentDocument.id}/ask`, { question: qaQuery });
      setQaHistory(prev => [{q: qaQuery, a: res.data.answer, sources: res.data.sources}, ...prev]);
      setQaQuery("");
    } catch (e) {
      toastError("Failed to get answer");
    } finally {
      setQaLoading(false);
    }
  };


  const fetchDocuments = async () => {
    try {
      const res = await apiClient.get('/upload/');
      const docs = res.data.documents || [];
      setDocuments(docs);
      
      if (!currentDocument) {
        const savedDocId = localStorage.getItem('lastAnalysisDocId');
        if (savedDocId) {
          const savedDoc = docs.find((d: any) => d.id === savedDocId);
          if (savedDoc) {
            setCurrentDocument(savedDoc);
            return;
          }
        }
        if (docs.length > 0) {
          setCurrentDocument(docs[0]);
          localStorage.setItem('lastAnalysisDocId', docs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchAnalysis = async (forceRefresh = false) => {
    if (!currentDocument) return;
    
    setLoading(true);
    if (forceRefresh) setRefreshing(true);

    try {
      if (forceRefresh) {
        await apiClient.post(`/analysis/${currentDocument.id}/refresh`);
      }
      const response = await apiClient.get(`/analysis/${currentDocument.id}`);
      setAnalysis(response.data);
    } catch (err: any) {
      if (forceRefresh) {
        toastError("Failed to refresh analysis.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentDocument?.id) {
      setAnalysis(null);
      setViewerPage(null);
      setViewerUrl(null);
      setQaHistory([]);
      setQaQuery("");
      setSearchQuery("");
      fetchAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDocument?.id]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2 && currentDocument) {
        setSearchLoading(true);
        setShowSearchDropdown(true);
        try {
          const res = await apiClient.get(`/analysis/${currentDocument.id}/search?q=${encodeURIComponent(searchQuery)}`);
          setSearchResults(res.data.results);
        } catch (e) {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults(null);
        setShowSearchDropdown(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentDocument]);

  if (loading && !analysis) return <SkeletonLoader />;

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 min-h-screen">
      
      <div className="flex flex-col gap-4 bg-background/95 pt-4 px-6 md:px-8 -mx-6 md:-mx-8 border-b border-borderToken shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[22px] font-bold font-display text-main tracking-tight">Document Analysis</h1>
            
            {documents.length > 0 && currentDocument && (
              <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                <select
                  value={currentDocument?.id || ""}
                  onChange={(e) => {
                    const selected = documents.find(d => d.id === e.target.value);
                    if (selected) {
                      setCurrentDocument(selected);
                      localStorage.setItem('lastAnalysisDocId', selected.id);
                    }
                  }}
                  className="bg-transparent border-none font-bold text-main outline-none cursor-pointer appearance-none pr-4 relative text-sm truncate max-w-[200px]"
                  style={{ background: 'url("data:image/svg+xml;utf8,<svg fill=\'currentColor\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>") no-repeat right', backgroundSize: '16px' }}
                >
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id} className="bg-surface text-main">
                      {doc.display_name || doc.name}
                    </option>
                  ))}
                </select>
                <Badge variant="primary" className="text-[9px] bg-primary/10 text-primary border-primary/20 tracking-wider">PDF</Badge>
                <span>Uploaded on {new Date(currentDocument.upload_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric'})}</span>
                <span>•</span>
                <span>{analysis?.page_count || 0} Pages</span>
                <span>•</span>
                <span>{currentDocument.file_size || '0 MB'}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search in document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                className="w-full bg-surface border border-borderToken rounded-lg pl-9 pr-12 py-2 text-xs text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
              />
              <div className="absolute right-2 top-2 text-[10px] text-muted font-bold tracking-wider bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Ctrl+K</div>
              
              {showSearchDropdown && searchQuery.length > 2 && (
                <div className="absolute top-12 left-0 w-full md:w-80 bg-surface border border-borderToken rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-80">
                  {searchLoading ? (
                    <div className="p-4 flex items-center justify-center text-muted text-xs"><Loader2 className="w-4 h-4 animate-spin mr-2"/> Searching...</div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <div className="overflow-y-auto custom-scrollbar">
                      {searchResults.map((res, i) => (
                        <div key={i} onClick={() => handleViewSource(res.page)} className="p-3 border-b border-borderToken hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-primary">Page {res.page}</span>
                            <span className="text-[9px] text-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">View Source <ArrowRight className="w-2.5 h-2.5"/></span>
                          </div>
                          <p className="text-xs text-main/80 line-clamp-3 leading-relaxed">...{res.text}...</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted text-xs">No results found in this document.</div>
                  )}
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={() => fetchAnalysis(true)} disabled={refreshing} className="text-xs h-9 shadow-sm bg-surface">
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>

            <div className="relative">
              <Button size="sm" onClick={() => setExportDropdownOpen(!exportDropdownOpen)} disabled={!!exportLoading} className="text-xs h-9 shadow-sm min-w-[120px] bg-primary text-white hover:bg-primary/90">
                {exportLoading ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Exporting...</> : <>Export Report <ChevronDown className="w-3.5 h-3.5 ml-2"/></>}
              </Button>
              {exportDropdownOpen && (
                <div className="absolute right-0 top-11 w-32 bg-surface border border-borderToken rounded-lg shadow-xl py-1 z-50 flex flex-col overflow-hidden">
                  {["pdf", "excel", "csv", "json", "txt"].map(fmt => (
                    <button key={fmt} onClick={() => handleExport(fmt)} className="px-4 py-2.5 text-xs font-bold text-left text-muted hover:text-primary hover:bg-primary/5 transition-colors uppercase">
                      {fmt === "excel" ? "XLSX" : fmt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 w-full overflow-x-auto custom-scrollbar pt-4">
          {["Overview", "Structure", "Insights", "Keywords", "Entities", "Charts", "Ask Document"].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-semibold transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-primary' : 'text-muted hover:text-main'}`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6">
        {activeTab === "Ask Document" && (
          <Card className="p-6 flex flex-col gap-6 shadow-sm border border-borderToken max-w-4xl mx-auto">
            <div className="flex items-center gap-2 border-b border-borderToken pb-4">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-sm text-main uppercase tracking-wide">Ask This Document</h3>
            </div>
            
            {qaHistory.length > 0 && (
              <div className="flex flex-col gap-5 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {qaHistory.map((item, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl rounded-tl-none self-start max-w-[85%] border border-borderToken">
                      <p className="text-sm font-bold text-main">{item.q}</p>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl rounded-tr-none self-end max-w-[85%]">
                      <AIResponseRenderer content={item.a} />
                      {item.sources.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-primary/10">
                          <span className="text-[10px] text-primary/70 font-bold uppercase tracking-wider">Sources</span>
                          {item.sources.map((p, j) => (
                            <button key={j} onClick={() => handleViewSource(p)} className="text-[10px] font-bold bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded transition-colors flex items-center gap-1 border border-primary/20">
                              Page {p}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-3 relative mt-2">
              <input 
                type="text" 
                placeholder="E.g., What is the main objective of this document?" 
                value={qaQuery}
                onChange={(e) => setQaQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                className="w-full bg-surface border border-borderToken rounded-xl pl-5 pr-12 py-3 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
              />
              <Button onClick={handleAsk} disabled={qaLoading || !qaQuery.trim()} className="absolute right-2 h-9 w-9 p-0 shrink-0 bg-primary hover:bg-primary/90 text-white rounded-lg">
                {qaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </Button>
            </div>
          </Card>
        )}

        {analysis && (
          <div className="flex flex-col gap-6">
            
            {activeTab === "Overview" && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  <Card className="p-4 shadow-sm border border-borderToken flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow bg-surface">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-100 dark:border-indigo-500/20 shrink-0 group-hover:scale-110 transition-transform">
                        <span className="font-bold text-lg font-serif">T</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Total Words</span>
                        <strong className="text-xl font-black text-main">{stats.totalWords?.toLocaleString() || 0}</strong>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 shadow-sm border border-borderToken flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow bg-surface">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-100 dark:border-emerald-500/20 shrink-0 group-hover:scale-110 transition-transform">
                        <List className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Sentences</span>
                        <strong className="text-xl font-black text-main">{stats.sentenceCount?.toLocaleString() || 0}</strong>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 shadow-sm border border-borderToken flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow bg-surface">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-100 dark:border-blue-500/20 shrink-0 group-hover:scale-110 transition-transform">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Reading Time</span>
                        <strong className="text-xl font-black text-main">{Math.max(1, Math.round((stats.totalWords || 0) / 200))} min</strong>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 shadow-sm border border-borderToken flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow bg-surface">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-100 dark:border-amber-500/20 shrink-0 group-hover:scale-110 transition-transform">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Speech Time</span>
                        <strong className="text-xl font-black text-main">{Math.max(1, Math.round((stats.totalWords || 0) / 130))} min</strong>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 shadow-sm border border-borderToken flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow bg-surface">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-100 dark:border-cyan-500/20 shrink-0 group-hover:scale-110 transition-transform">
                        <FileBadge className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Pages Processed</span>
                        <strong className="text-xl font-black text-main">{stats.pagesProcessed || 0} / {analysis.page_count}</strong>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 shadow-sm border border-borderToken flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow bg-surface">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-100 dark:border-purple-500/20 shrink-0 group-hover:scale-110 transition-transform">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Language</span>
                        <strong className="text-xl font-black text-main capitalize">{analysis.language_analysis.language}</strong>
                      </div>
                    </div>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-5 flex flex-col gap-5 shadow-sm border border-borderToken bg-surface">
                    <div className="flex items-center gap-2 border-b border-borderToken pb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <h3 className="font-bold text-xs text-main uppercase tracking-wide">Document Processing Status</h3>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col gap-3 flex-1">
                        <div className="flex items-center gap-2 text-sm text-main">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>File validated</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-main">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{analysis.page_count} pages detected</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-main">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Text extracted</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-main">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Language detected</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-main">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>NLP analysis completed</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-5 flex flex-col gap-4 shadow-sm border border-borderToken bg-surface">
                    <div className="flex justify-between items-center border-b border-borderToken pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="font-bold text-xs text-main uppercase tracking-wide">AI Document Overview</h3>
                      </div>
                    </div>
                    <AIResponseRenderer content={displayOverview || "No overview available."} />
                  </Card>
                </div>
              </div>
            )}
            
            {activeTab === "Structure" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="p-5 flex flex-col gap-4 shadow-sm border border-borderToken bg-surface">
                  <div className="flex justify-between items-center border-b border-borderToken pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="font-bold text-xs text-main uppercase tracking-wide">Document Structure</h3>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 text-xs">
                     <div className="flex justify-between font-bold text-muted uppercase border-b border-borderToken pb-2">
                       <span>Chapter / Section</span>
                       <span>Page</span>
                     </div>
                     {stats.structure && stats.structure.length > 0 ? stats.structure.map((item, idx) => (
                       <div key={idx} className="flex justify-between hover:bg-slate-50 dark:hover:bg-slate-800 p-2 -mx-2 rounded cursor-pointer group" onClick={() => handleViewSource(item.start_page || item.page || 1)}>
                         <span className="font-bold text-main group-hover:text-primary transition-colors">{item.section}</span>
                         <span className="text-muted">p.{item.start_page || item.page || ""}</span>
                       </div>
                     )) : <div className="py-4 text-center text-muted italic">No structure detected.</div>}
                  </div>
                </Card>
              </div>
            )}
            
            {activeTab === "Insights" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col gap-6">
                  <Card className="p-5 flex flex-col gap-4 shadow-sm border border-borderToken bg-surface">
                    <div className="flex justify-between items-center border-b border-borderToken pb-2">
                      <div className="flex items-center gap-2">
                        <List className="w-4 h-4 text-primary" />
                        <h3 className="font-bold text-xs text-main uppercase tracking-wide">Key Insights & Takeaways</h3>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      {stats.takeaways && stats.takeaways.length > 0 ? stats.takeaways.map((takeaway, idx) => (
                        <div key={idx} className="flex gap-3 items-start group">
                          <span className="flex items-center justify-center bg-primary/10 text-primary font-black text-[10px] w-5 h-5 rounded-full mt-0.5 shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex items-start justify-between w-full gap-2">
                            <span className="text-xs font-medium text-main leading-relaxed">{renderHighlighted(takeaway.text)}</span>
                            <button onClick={() => handleViewSource(takeaway.page)} className="text-[10px] font-bold text-muted hover:text-primary whitespace-nowrap pt-0.5">
                              Page {takeaway.page}
                            </button>
                          </div>
                        </div>
                      )) : <div className="py-4 text-center text-muted italic">No takeaways extracted.</div>}
                    </div>
                  </Card>
                </div>
                
                <div className="flex flex-col gap-6">
                  <Card className="p-5 flex flex-col gap-5 shadow-sm border border-borderToken bg-surface">
                    <div className="flex justify-between items-center border-b border-borderToken pb-2">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-primary" />
                        <h3 className="font-bold text-xs text-main uppercase tracking-wide">Tone & Writing Style</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1 block">Overall Tone</span>
                        <strong className="text-primary font-bold capitalize text-sm">{tone.tone || "Formal"}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1 block">Writing Style</span>
                        <strong className="text-primary font-bold capitalize text-sm line-clamp-2">{tone.writingStyle || "Academic"}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1 block">Sentiment</span>
                        <strong className="text-emerald-500 font-bold capitalize text-sm">{tone.sentiment || "Positive"}</strong>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-5 flex flex-col gap-4 shadow-sm border border-borderToken bg-surface">
                    <div className="flex justify-between items-center border-b border-borderToken pb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-500" />
                        <h3 className="font-bold text-xs text-main uppercase tracking-wide">Important Facts & Figures</h3>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      {stats.facts && stats.facts.length > 0 ? (
                        stats.facts.slice(0,4).map((fact, idx) => (
                          <div key={idx} className="flex gap-3 items-start group pt-2 border-t border-borderToken/50 first:pt-0 first:border-0">
                            <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-100 dark:border-amber-500/20 mt-0.5 shrink-0">
                              <Activity className="w-3 h-3" />
                            </div>
                            <div className="flex flex-col w-full">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-medium text-main leading-relaxed">{renderHighlighted(fact.value || fact.text || fact.fact || fact.description || "Fact")}</span>
                                <button onClick={() => handleViewSource(fact.page)} className="text-[10px] font-bold text-muted hover:text-primary whitespace-nowrap pt-0.5">
                                  Page {fact.page}
                                </button>
                              </div>
                              {fact.context && <p className="text-[10px] text-muted line-clamp-2 mt-0.5">{fact.context}</p>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted italic text-xs py-4">No facts extracted.</div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}
            
            {activeTab === "Keywords" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="p-5 flex flex-col gap-4 shadow-sm border border-borderToken bg-surface">
                  <div className="flex justify-between items-center border-b border-borderToken pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <h3 className="font-bold text-xs text-main uppercase tracking-wide">Key Concepts</h3>
                    </div>
                  </div>
                  <div className="h-72 mt-2 relative">
                     <ReactApexChart options={conceptsChartOptions} series={conceptsSeries} type="bar" height="100%" />
                  </div>
                </Card>
              </div>
            )}
            
            {activeTab === "Entities" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="p-5 flex flex-col gap-4 shadow-sm border border-borderToken bg-surface">
                  <div className="flex justify-between items-center border-b border-borderToken pb-2">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-primary" />
                      <h3 className="font-bold text-xs text-main uppercase tracking-wide">Key Entities</h3>
                    </div>
                  </div>
                  <div className="flex flex-col gap-6">
                                        {[
                      { category: "People", list: entities.People || entities.people || [], color: "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/20 dark:border-rose-800/30" },
                      { category: "Organizations", list: entities.Organizations || entities.organizations || [], color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/30" },
                      { category: "Locations", list: entities.Locations || entities.locations || [], color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/30" },
                      { category: "Technologies", list: entities.Technologies || entities.technologies || [], color: "text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-900/20 dark:border-indigo-800/30" },
                      { category: "Models", list: entities.Models || entities.models || [], color: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800/30" },
                      { category: "Dates", list: entities.Dates || entities.dates || [], color: "text-muted bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800/30" },
                    ].map((ent, idx) => {
                      if (!ent.list || ent.list.length === 0) return null;
                      return (
                        <div key={idx} className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-muted uppercase tracking-wider border-b border-borderToken pb-1">{ent.category}</span>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {ent.list.slice(0,12).map((item: any, i: number) => (
                              <div key={i} className={`px-2.5 py-1 rounded text-xs font-semibold border ${ent.color}`}>
                                {renderHighlighted(item.entity)} <span className="opacity-60 ml-1 text-[10px]">({item.count})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}
            
            {activeTab === "Charts" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="p-5 flex flex-col gap-4 shadow-sm border border-borderToken bg-surface max-w-2xl mx-auto">
                  <div className="flex justify-between items-center border-b border-borderToken pb-2">
                    <div className="flex items-center gap-2">
                      <Map className="w-4 h-4 text-primary" />
                      <h3 className="font-bold text-xs text-main uppercase tracking-wide">Topics Distribution</h3>
                    </div>
                  </div>
                  <div className="flex items-center h-64 mt-4 relative justify-center">
                    <ReactApexChart options={topicsChartOptions} series={topicsSeries} type="donut" width="100%" height="100%" />
                  </div>
                </Card>
              </div>
            )}
            
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {viewerPage !== null && viewerUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-5xl h-[90vh] flex flex-col bg-surface shadow-2xl border border-borderToken overflow-hidden animate-in zoom-in-95 duration-200 rounded-xl">
            <div className="flex justify-between items-center p-3 border-b border-borderToken bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-bold text-sm text-main">{currentDocument?.name}</h3>
                  <p className="text-xs text-muted">Viewing Page {viewerPage}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewerPage(Math.max(1, viewerPage - 1))}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setViewerPage(viewerPage + 1)}>Next</Button>
                <div className="w-px h-6 bg-borderToken mx-2"></div>
                <Button variant="outline" size="sm" onClick={() => setViewerPage(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 w-full bg-slate-100 dark:bg-slate-800">
              <iframe 
                src={`${viewerUrl}#page=${viewerPage}`} 
                className="w-full h-full border-none"
                title="Document Viewer"
              />
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};

export default DocumentAnalysis;
