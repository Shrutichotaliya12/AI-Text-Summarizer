import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Trash2, 
  Eye, 
  Download, 
  Sparkles, 
  Heart, 
  Calendar, 
  Cpu, 
  Globe, 
  Percent, 
  Clock, 
  ArrowUpDown,
  BookOpen,
  X,
  Copy,
  Edit2,
  GitCompare,
  FileText,
  FileCheck,
  Code,
  AlertTriangle
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { apiClient } from "@/api";
import { useTranslation } from "@/context/TranslationContext";
import { useToast } from "@/context/ToastContext";

interface SummaryItem {
  id: string;
  document_id: string | null;
  title: string;
  originalText: string;
  summaryText: string;
  modelUsed: string;
  language: string;
  confidence: number;
  compression: number;
  readingTimeSaved: number;
  keywords: string[];
  isFavorite: boolean;
  createdDate: string;
}

export const SummaryHistory: React.FC = () => {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Filtering & Sorting
  const [searchText, setSearchText] = useState("");
  const [sortField, setSortField] = useState<"createdDate" | "confidence" | "compression" | "title">("createdDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterModel, setFilterModel] = useState("all");
  const [filterLang, setFilterLang] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  // Drawer & Selection States
  const [selectedSummary, setSelectedSummary] = useState<SummaryItem | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");

  // Fetch summaries on mount
  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/summary/");
      setSummaries(response.data.summaries || []);
    } catch (error) {
      console.error("Failed to fetch summaries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await apiClient.post(`/summary/${id}/favorite`);
      setSummaries(prev => prev.map(s => 
        s.id === id ? { ...s, isFavorite: response.data.isFavorite } : s
      ));
      if (selectedSummary && selectedSummary.id === id) {
        setSelectedSummary(prev => prev ? { ...prev, isFavorite: response.data.isFavorite } : null);
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleDeleteSummary = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleConfirmDeleteSummary = async () => {
    if (!deleteConfirmId) return;
    try {
      await apiClient.delete(`/summary/${deleteConfirmId}`);
      setSummaries(prev => prev.filter(s => s.id !== deleteConfirmId));
      if (selectedSummary && selectedSummary.id === deleteConfirmId) {
        setSelectedSummary(null);
      }
      success("Document Deleted Successfully");
      setDeleteConfirmId(null);
    } catch (error) {
      toastError("Failed to delete summary.");
    }
  };

  const handleRenameSummary = async () => {
    if (!renameTitle.trim() || !selectedSummary) return;
    try {
      await apiClient.put(`/summary/edit/${selectedSummary.id}`, {
        title: renameTitle.trim()
      });
      setSummaries(prev => prev.map(s => 
        s.id === selectedSummary.id ? { ...s, title: renameTitle.trim() } : s
      ));
      setSelectedSummary(prev => prev ? { ...prev, title: renameTitle.trim() } : null);
      setIsRenaming(false);
      success("Settings Saved Successfully"); // Map rename to settings saved status
    } catch (error) {
      console.error("Failed to rename summary:", error);
      toastError("Failed to rename summary title.");
    }
  };

  const handleCopyToClipboard = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    success("Copied to clipboard.");
  };

  const handleExport = (item: SummaryItem, format: "txt" | "json" | "csv" | "md" | "pdf" | "docx", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let content = "";
    let filename = `${item.title.toLowerCase().replace(/\s+/g, "_")}_summary`;
    let mimeType = "text/plain";

    if (format === "txt") {
      content = `Title: ${item.title}\nModel: ${item.modelUsed}\nLanguage: ${item.language}\nDate: ${new Date(item.createdDate).toLocaleDateString()}\n\nOriginal Text:\n${item.originalText}\n\nSummary:\n${item.summaryText}`;
      filename += ".txt";
      mimeType = "text/plain";
    } else if (format === "json") {
      content = JSON.stringify(item, null, 2);
      filename += ".json";
      mimeType = "application/json";
    } else if (format === "csv") {
      content = `"Title","Model","Language","CreatedDate","Summary"\n"${item.title.replace(/"/g, '""')}","${item.modelUsed}","${item.language}","${item.createdDate}","${item.summaryText.replace(/"/g, '""')}"`;
      filename += ".csv";
      mimeType = "text/csv";
    } else if (format === "md") {
      content = `# Summary: ${item.title}\n- **Model**: ${item.modelUsed}\n- **Language**: ${item.language}\n- **Date**: ${new Date(item.createdDate).toLocaleDateString()}\n\n## Generated Summary\n${item.summaryText}\n\n## Original Text Context\n${item.originalText}`;
      filename += ".md";
      mimeType = "text/markdown";
    } else if (format === "pdf" || format === "docx") {
      // Beautiful HTML document with CSS styled formatting that acts as printable PDF/MS Word DOCX container
      content = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
              h1 { font-family: 'Trebuchet MS', sans-serif; color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              .meta { font-size: 11px; color: #64748b; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; }
              .section { margin-top: 25px; font-weight: bold; font-size: 13px; color: #475569; }
              .content-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; font-size: 12px; margin-top: 5px; }
            </style>
          </head>
          <body>
            <h1>${item.title}</h1>
            <div class="meta">Model: ${item.modelUsed.toUpperCase()} &bull; Language: ${item.language.toUpperCase()} &bull; Date: ${new Date(item.createdDate).toLocaleDateString()}</div>
            <div class="section">Summary Output:</div>
            <div class="content-box">${item.summaryText}</div>
            <div class="section">Original Text:</div>
            <div class="content-box" style="color: #64748b;">${item.originalText}</div>
          </body>
        </html>
      `;
      filename += format === "pdf" ? ".pdf" : ".doc";
      mimeType = format === "pdf" ? "application/pdf" : "application/msword";
    }

    const element = document.createElement("a");
    const file = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleToggleSelectCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(x => x !== id));
    } else {
      if (selectedForCompare.length >= 2) {
        toastError("You can compare a maximum of 2 summaries at a time.");
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  // Filter and Sort summaries list
  const filteredSummaries = summaries
    .filter(s => {
      const matchText = s.title.toLowerCase().includes(searchText.toLowerCase()) ||
                        s.summaryText.toLowerCase().includes(searchText.toLowerCase()) ||
                        s.originalText.toLowerCase().includes(searchText.toLowerCase()) ||
                        s.keywords.some(k => k.toLowerCase().includes(searchText.toLowerCase()));
      const matchModel = filterModel === "all" || s.modelUsed === filterModel;
      const matchLang = filterLang === "all" || s.language === filterLang;
      const matchDate = !filterDate || s.createdDate.startsWith(filterDate);
      
      return matchText && matchModel && matchLang && matchDate;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "createdDate") {
        comparison = new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
      } else if (sortField === "confidence" || sortField === "compression") {
        comparison = a[sortField] - b[sortField];
      } else {
        comparison = a.title.localeCompare(b.title);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const comparedItems = summaries.filter(s => selectedForCompare.includes(s.id));

  return (
    <div className="flex flex-col gap-6 select-none text-xs text-slate-700 dark:text-slate-300">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold font-display text-main">{t("page_title_history")}</h2>
          <p className="text-xs text-muted">
            Manage, review, favorite, and export all generated text summaries securely stored in your account.
          </p>
        </div>
        
        {/* Compare Floating Button */}
        {selectedForCompare.length === 2 && (
          <Button 
            onClick={() => setShowCompareModal(true)}
            className="text-[10px] gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-glow"
          >
            <GitCompare className="w-4 h-4" /> Compare Selected (2)
          </Button>
        )}
      </div>

      {/* Toolbar filters grid */}
      <div className="flex flex-col gap-3 bg-surface border border-borderToken rounded-xl p-4 shadow-sm">
        
        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search summaries, text, or keywords..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-app border border-borderToken rounded-lg pl-10 pr-4 py-2 text-xs text-main placeholder-muted/80 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Filters and Sorting Row */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2.5 items-center">
            {/* Model Filter */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-bold text-muted uppercase">AI Model</span>
              <select 
                value={filterModel} 
                onChange={(e) => setFilterModel(e.target.value)}
                className="bg-app border border-borderToken rounded px-2 py-1 text-[10px] text-main focus:outline-none"
              >
                <option value="all">All Models</option>
                <option value="distilbart">DistilBART</option>
                <option value="t5">T5-Base</option>
                <option value="pegasus">Pegasus</option>
              </select>
            </div>

            {/* Language Filter */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-bold text-muted uppercase">Language</span>
              <select 
                value={filterLang} 
                onChange={(e) => setFilterLang(e.target.value)}
                className="bg-app border border-borderToken rounded px-2 py-1 text-[10px] text-main focus:outline-none"
              >
                <option value="all">All Languages</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="gu">Gujarati</option>
                <option value="de">German</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-bold text-muted uppercase">Date</span>
              <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-app border border-borderToken rounded px-2 py-0.5 text-[10px] text-main focus:outline-none"
              />
            </div>
          </div>

          {/* Sorting */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
            {[
              { id: "createdDate", label: "Date" },
              { id: "confidence", label: "Confidence" },
              { id: "compression", label: "Compression" },
              { id: "title", label: "Title" }
            ].map(field => (
              <button
                key={field.id}
                onClick={() => handleSort(field.id as any)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${
                  sortField === field.id
                    ? "bg-primary border-transparent text-white"
                    : "bg-surface border-borderToken text-muted hover:text-main hover:bg-hover"
                }`}
              >
                {field.label}
                {sortField === field.id && <ArrowUpDown className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Grid of Summaries */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce delay-100 mr-1" />
          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce delay-200 mr-1" />
          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce delay-300" />
        </div>
      ) : filteredSummaries.length === 0 ? (
        <Card className="p-10 flex flex-col items-center justify-center text-center text-muted">
          <BookOpen className="w-10 h-10 mb-3 text-muted/60" />
          <p className="text-xs italic">No summaries found matching your search. Summarize some text on the Home page first.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSummaries.map(item => (
            <Card 
              key={item.id} 
              hoverGlow 
              className={`p-5 flex flex-col justify-between gap-4 cursor-pointer group border-2 ${
                selectedForCompare.includes(item.id) ? "border-primary/60 bg-primary/[0.02]" : "border-borderToken"
              }`}
              onClick={() => setSelectedSummary(item)}
            >
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={selectedForCompare.includes(item.id)}
                      onChange={(e) => handleToggleSelectCompare(item.id, e as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-borderToken text-primary h-3.5 w-3.5 focus:ring-primary accent-primary cursor-pointer"
                    />
                    <h4 className="font-bold text-xs text-main truncate max-w-[150px] font-display">{item.title}</h4>
                  </div>
                  <button 
                    onClick={(e) => handleToggleFavorite(item.id, e)} 
                    className="p-1 text-muted hover:text-red-500 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${item.isFavorite ? "fill-red-500 text-red-500" : "text-muted"}`} />
                  </button>
                </div>
                <p className="text-[10px] text-muted line-clamp-3 leading-relaxed select-text">
                  {item.summaryText}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.keywords.slice(0, 3).map((kw, i) => (
                    <Badge key={i} variant="primary" className="text-[8px] px-1.5 py-0.5 border-transparent bg-primary/10 text-primary">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-borderToken/40 text-[9px] text-muted font-semibold mt-2 select-none">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-indigo-500" /> {new Date(item.createdDate).toLocaleDateString()}</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={(e) => handleCopyToClipboard(item.summaryText, e)} 
                    title="Copy to clipboard"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => handleExport(item, "txt", e)} 
                    title="Download summary"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteSummary(item.id, e)} 
                    title="Delete summary"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-danger transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Slide-out Preview Drawer Overlay */}
      <AnimatePresence>
        {selectedSummary && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isRenaming) setSelectedSummary(null);
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="relative w-full max-w-lg bg-surface h-full shadow-premium p-6 border-l border-borderToken flex flex-col justify-between z-10"
            >
              <div className="flex flex-col gap-5 h-full overflow-hidden">
                <div className="flex justify-between items-start border-b border-borderToken/80 pb-3">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <div>
                      {isRenaming ? (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={renameTitle}
                            onChange={(e) => setRenameTitle(e.target.value)}
                            className="bg-app border border-borderToken rounded px-2 py-0.5 text-xs text-main focus:outline-none"
                          />
                          <Button size="sm" onClick={handleRenameSummary} className="text-[10px] py-0.5 px-2">Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setIsRenaming(false)} className="text-[10px] py-0.5 px-2 border-borderToken">Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-main font-display">{selectedSummary.title}</h3>
                          <button 
                            onClick={() => {
                              setRenameTitle(selectedSummary.title);
                              setIsRenaming(true);
                            }}
                            className="text-muted hover:text-main"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-muted">{new Date(selectedSummary.createdDate).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={(e) => handleToggleFavorite(selectedSummary.id, e)} 
                      className="p-1.5 rounded-md hover:bg-hover text-muted hover:text-red-500 transition-colors"
                    >
                      <Heart className={`w-4 h-4 ${selectedSummary.isFavorite ? "fill-red-500 text-red-500" : "text-muted"}`} />
                    </button>
                    <button onClick={() => setSelectedSummary(null)} className="p-1 rounded-md hover:bg-hover text-muted hover:text-main">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-muted">
                    <div className="p-2 border border-borderToken rounded-lg bg-slate-50/50 dark:bg-dark-900/10">
                      <Cpu className="w-3.5 h-3.5 text-indigo-500 mx-auto mb-1" />
                      <span className="block font-bold text-main">{selectedSummary.modelUsed.toUpperCase()}</span>
                      Model
                    </div>
                    <div className="p-2 border border-borderToken rounded-lg bg-slate-50/50 dark:bg-dark-900/10">
                      <Percent className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
                      <span className="block font-bold text-main">{selectedSummary.compression}%</span>
                      Compression
                    </div>
                    <div className="p-2 border border-borderToken rounded-lg bg-slate-50/50 dark:bg-dark-900/10">
                      <Clock className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
                      <span className="block font-bold text-main">{selectedSummary.readingTimeSaved}m</span>
                      Saved Time
                    </div>
                    <div className="p-2 border border-borderToken rounded-lg bg-slate-50/50 dark:bg-dark-900/10">
                      <Globe className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                      <span className="block font-bold text-main">{selectedSummary.language.toUpperCase()}</span>
                      Language
                    </div>
                  </div>

                  {/* Summary Text Area */}
                  <div className="flex flex-col gap-1.5 relative group">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Summary Output:</span>
                      <button 
                        onClick={() => handleCopyToClipboard(selectedSummary.summaryText)}
                        className="text-muted hover:text-primary p-1 bg-slate-100 dark:bg-slate-800 rounded border border-borderToken"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-xs leading-relaxed text-main whitespace-pre-wrap select-text">
                      {selectedSummary.summaryText}
                    </div>
                  </div>

                  {/* Original Text Area */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Original Text Context:</span>
                    <div className="p-4 bg-app border border-borderToken rounded-lg text-xs leading-relaxed text-muted max-h-[150px] overflow-y-auto whitespace-pre-wrap select-text">
                      {selectedSummary.originalText}
                    </div>
                  </div>

                  {/* Multi-Format Export Tray */}
                  <div className="flex flex-col gap-1.5 border-t border-borderToken/50 pt-3">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Download Formats:</span>
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleExport(selectedSummary, "txt")} className="text-[10px] gap-1 px-1.5 border-borderToken"><FileText className="w-3 h-3" /> TXT</Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport(selectedSummary, "md")} className="text-[10px] gap-1 px-1.5 border-borderToken"><FileCheck className="w-3 h-3" /> MD</Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport(selectedSummary, "csv")} className="text-[10px] gap-1 px-1.5 border-borderToken"><Code className="w-3 h-3" /> CSV</Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport(selectedSummary, "json")} className="text-[10px] gap-1 px-1.5 border-borderToken"><Code className="w-3 h-3" /> JSON</Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport(selectedSummary, "pdf")} className="text-[10px] gap-1 px-1.5 border-borderToken"><FileText className="w-3 h-3 text-red-500" /> PDF</Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport(selectedSummary, "docx")} className="text-[10px] gap-1 px-1.5 border-borderToken"><FileText className="w-3 h-3 text-blue-500" /> DOCX</Button>
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1 text-xs"
                  onClick={() => setSelectedSummary(null)}
                >
                  Close Preview
                </Button>
                <Button 
                  className="flex-1 text-xs bg-danger hover:bg-danger-hover text-white border-transparent"
                  onClick={() => handleDeleteSummary(selectedSummary.id)}
                >
                  Delete Record
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Side-by-side Comparative View Modal */}
      <AnimatePresence>
        {showCompareModal && comparedItems.length === 2 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompareModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-surface p-6 rounded-xl border border-borderToken shadow-premium z-10 flex flex-col gap-4 text-xs h-[85vh]"
            >
              <div className="flex justify-between items-center border-b border-borderToken pb-2">
                <h3 className="font-bold text-sm font-display text-main flex items-center gap-2"><GitCompare className="w-5 h-5 text-primary" /> Side-by-Side Summary Comparison</h3>
                <button onClick={() => setShowCompareModal(false)} className="p-1 rounded hover:bg-hover text-muted hover:text-main">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Compare Columns */}
              <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
                {comparedItems.map((item, idx) => (
                  <div key={item.id} className="flex flex-col gap-4 overflow-y-auto pr-1">
                    <div className="p-3 bg-slate-50/50 dark:bg-dark-900/10 border border-borderToken rounded-lg flex flex-col gap-1">
                      <span className="font-bold text-xs text-primary font-display">Summary {idx+1}: {item.title}</span>
                      <span className="text-[10px] text-muted">Model: {item.modelUsed.toUpperCase()} &bull; Compression: {item.compression}%</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-muted uppercase">Summary Output:</span>
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-xs leading-relaxed text-main whitespace-pre-wrap select-text">
                        {item.summaryText}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-muted uppercase">Original Source Context:</span>
                      <div className="p-4 bg-app border border-borderToken rounded-lg text-xs leading-relaxed text-muted max-h-[220px] overflow-y-auto whitespace-pre-wrap select-text">
                        {item.originalText}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-borderToken pt-4 flex justify-end">
                <Button onClick={() => setShowCompareModal(false)}>Close Comparison</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Confirm Delete Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface p-6 rounded-xl border border-danger/30 shadow-premium z-10 flex flex-col gap-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-borderToken pb-3">
                <div className="flex items-center gap-2.5 text-danger">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                  <h3 className="font-bold text-xs font-display">Delete Summary</h3>
                </div>
                <button onClick={() => setDeleteConfirmId(null)} className="text-muted hover:text-main">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                Are you sure you want to delete this summary? This action cannot be undone.
              </p>

              <div className="flex gap-2.5 mt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 text-[10px] border-borderToken"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmDeleteSummary}
                  className="flex-1 text-[10px] bg-danger hover:bg-danger-hover text-white border-transparent"
                >
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default SummaryHistory;
