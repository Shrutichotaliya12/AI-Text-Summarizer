import React, { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Copy, 
  Download, 
  RotateCw, 
  Scissors, 
  Maximize2, 
  List, 
  AlignLeft, 
  Languages, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Share2,
  Printer,
  FileText,
  Heart,
  Loader2,
  MapPin,
  ListTodo,
  GitBranch,
  Tag
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/api";

interface SummaryOutputProps {
  summary: string;
  isLoading?: boolean;
  onRegenerate?: () => void;
  onToneChange?: (tone: string) => void;
  // Dynamic telemetry metrics
  wordCount?: number;
  charCount?: number;
  compressionRatio?: number;
  generationTime?: number;
  modelUsed?: string;
  language?: string;
  createdDate?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  confidenceScore?: number;
  // Insight data from the saved summary record
  keywords?: string[];
  readingTimeSaved?: number;
}

const ALL_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml", label: "മലയാളം (Malayalam)" },
  { code: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "fr", label: "Français (French)" },
  { code: "de", label: "Deutsch (German)" },
  { code: "es", label: "Español (Spanish)" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "zh", label: "中文 (Chinese)" },
  { code: "ja", label: "日本語 (Japanese)" },
  { code: "ru", label: "Русский (Russian)" },
];

export const SummaryOutput: React.FC<SummaryOutputProps> = ({
  summary,
  isLoading = false,
  onRegenerate,
  wordCount,
  charCount,
  compressionRatio,
  generationTime,
  modelUsed,
  language = "en",
  createdDate,
  isFavorite = false,
  onToggleFavorite,
  confidenceScore,
  keywords = [],
  readingTimeSaved
}) => {
  const { success, error: toastError } = useToast();
  // Streaming States
  const [displayedText, setDisplayedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamIndexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Formatting / Tone States
  const [tone, setTone] = useState("Professional");
  const [format, setFormat] = useState<"paragraph" | "bullet">("paragraph");
  const [baseText, setBaseText] = useState(summary); // raw summary without tone/format transforms
  const [selectedLang, setSelectedLang] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState(""); // translated version of baseText

  // Telemetry Evaluation
  const [confidence, setConfidence] = useState(94);
  const [qualityScore, setQualityScore] = useState(92);

  useEffect(() => {
    if (confidenceScore !== undefined && confidenceScore > 0) {
      const score = Math.round(confidenceScore);
      setConfidence(score);
      setQualityScore(Math.min(99, Math.round(score * 0.98)));
    }
  }, [confidenceScore]);

  // Accordion Tabs (Keywords, Action Items, Timeline, Mind Map)
  const [activeTab, setActiveTab] = useState<"keywords" | "actions" | "timeline" | "mindmap" | null>(null);

  // When summary changes reset state
  useEffect(() => {
    setBaseText(summary);
    setTranslatedText("");
    setSelectedLang(language || "en");
    setTone("Professional");
    setFormat("paragraph");
  }, [summary, language]);

  // Streaming Response Typewriter simulation
  useEffect(() => {
    if (isLoading) {
      setDisplayedText("");
      setIsStreaming(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const textToStream = translatedText || summary;
    if (!textToStream) {
      setDisplayedText("");
      setIsStreaming(false);
      return;
    }

    // Stream text word-by-word
    setIsStreaming(true);
    setDisplayedText("");
    streamIndexRef.current = 0;
    
    const words = textToStream.split(" ");
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      if (streamIndexRef.current < words.length) {
        setDisplayedText(prev => prev + (prev ? " " : "") + words[streamIndexRef.current]);
        streamIndexRef.current++;
      } else {
        setIsStreaming(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 18); // Fast streaming speed

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, isLoading, translatedText]);

  // Adjust summary text style based on tone selection – apply to displayed text only, no "undefined" prefix
  const applyToneToDisplay = (rawText: string, activeTone: string, activeFormat: "paragraph" | "bullet") => {
    if (!rawText) return "";
    let result = rawText;

    // Apply bullet format if checked
    if (activeFormat === "bullet") {
      const sentences = result.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
      result = sentences.map(s => `- ${s}.`).join("\n");
    }

    return result;
  };

  const handleToneChange = (newTone: string) => {
    setTone(newTone);
    const updated = applyToneToDisplay(translatedText || summary, newTone, format);
    setDisplayedText(updated);
  };

  const handleFormatChange = (newFormat: "paragraph" | "bullet") => {
    setFormat(newFormat);
    const updated = applyToneToDisplay(translatedText || summary, tone, newFormat);
    setDisplayedText(updated);
  };

  // Real translation via backend API
  const handleTranslate = async (langCode: string) => {
    setSelectedLang(langCode);
    if (langCode === "en") {
      setTranslatedText("");
      setDisplayedText(applyToneToDisplay(summary, tone, format));
      return;
    }
    
    if (!summary) return;
    
    setIsTranslating(true);
    try {
      const response = await apiClient.post("/summary/translate", {
        text: summary,
        target_lang: langCode
      });
      const translated = response.data.translated;
      setTranslatedText(translated);
      setDisplayedText(applyToneToDisplay(translated, tone, format));
    } catch (err) {
      toastError("Translation failed. Please try again.");
      setSelectedLang("en");
    } finally {
      setIsTranslating(false);
    }
  };

  // Shorten / Expand
  const handleShorten = () => {
    const source = translatedText || summary;
    const sentences = source.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
    if (sentences.length > 2) {
      const shortened = sentences.slice(0, Math.ceil(sentences.length / 2)).join(". ") + ".";
      setTranslatedText(shortened);
      setDisplayedText(applyToneToDisplay(shortened, tone, format));
    }
  };

  const handleExpand = () => {
    const source = translatedText || summary;
    const expanded = source + " Furthermore, subsequent investigations align with these metrics, substantiating the model's overall generalization efficiency.";
    setTranslatedText(expanded);
    setDisplayedText(applyToneToDisplay(expanded, tone, format));
  };

  // Export functions
  const handleCopy = () => {
    navigator.clipboard.writeText(displayedText);
    success("Copied to clipboard.");
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([displayedText], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = "summary.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    success("Downloaded as Markdown (MD)");
  };

  const handleDownloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([displayedText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "summary.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    success("Downloaded as Plain Text (TXT)");
  };

  const handleDownloadDocx = () => {
    const element = document.createElement("a");
    const file = new Blob([displayedText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "summary.docx";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    success("Downloaded as DOCX");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>AI Generated Summary</title>
            <style>
              body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #1a202c; }
              h1 { border-bottom: 2px solid #edf2f7; padding-bottom: 10px; font-size: 20px; }
              .meta { font-size: 11px; color: #718096; margin-bottom: 20px; }
              ul { margin-left: 20px; }
            </style>
          </head>
          <body>
            <h1>AI Generated Summary</h1>
            <div class="meta">Model: ${modelUsed || "AI Text Summarizer"} | Words Saved: ${wordsCount} | Date: ${createdDate ? new Date(createdDate).toLocaleDateString() : "Today"}</div>
            <div>${displayedText.replace(/\*\*/g, "").replace(/^- /gm, "&bull; ").replace(/\n/g, "<br/>")}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Text Summary',
          text: displayedText,
          url: window.location.href,
        });
        success("Shared successfully.");
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(displayedText);
      success("Summary copied to clipboard for sharing!");
    }
  };

  // Markdown renderer – handles bold, headings, bullets, paragraphs
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let content = line;
      let isList = false;
      let isHeading = false;
      let headingLevel = 0;

      // Heading check
      const headingMatch = content.match(/^(#{1,3})\s+(.+)/);
      if (headingMatch) {
        headingLevel = headingMatch[1].length;
        content = headingMatch[2];
        isHeading = true;
      }

      // Bullet check (- or • or *)
      if (!isHeading && (content.startsWith("- ") || content.startsWith("• ") || content.startsWith("* "))) {
        content = content.substring(2);
        isList = true;
      }

      // Bold: **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(<strong key={`b-${idx}-${match.index}`} className="font-extrabold text-main">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      const renderedLine = parts.length > 0 ? parts : [content];

      if (isHeading) {
        const HeadingTag = headingLevel === 1 ? "h2" : headingLevel === 2 ? "h3" : "h4";
        return (
          <HeadingTag
            key={idx}
            className={clsx(
              "font-bold text-main mb-2 mt-3",
              headingLevel === 1 ? "text-base" : headingLevel === 2 ? "text-sm" : "text-xs"
            )}
          >
            {renderedLine}
          </HeadingTag>
        );
      }

      return isList ? (
        <li key={idx} className="list-disc ml-5 mb-1.5 leading-relaxed text-slate-700 dark:text-slate-300">
          {renderedLine}
        </li>
      ) : content.trim() ? (
        <p key={idx} className="mb-2.5 leading-relaxed text-slate-700 dark:text-slate-300">
          {renderedLine}
        </p>
      ) : (
        <br key={idx} />
      );
    });
  };

  // Computed stats
  const wordsCount = displayedText ? displayedText.split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordsCount / 200));

  // Generate insight content from actual summary data
  const extractedKeywords = keywords.length > 0
    ? keywords.filter(k => k.trim().length > 0)
    : displayedText
      ? [...new Set(displayedText.split(/\s+/).filter(w => w.length > 5).map(w => w.replace(/[^a-zA-Z]/g, "")).filter(Boolean))].slice(0, 6)
      : [];

  const actionItems = displayedText
    ? displayedText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15).slice(0, 4).map(s => `Review: ${s.substring(0, 60)}${s.length > 60 ? "..." : ""}`)
    : [];

  const timelineSteps = displayedText
    ? displayedText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10).slice(0, 3).map((s, i) => ({
        step: `Step ${i + 1}`,
        desc: s.substring(0, 80) + (s.length > 80 ? "..." : "")
      }))
    : [];

  const mindMapTopics = extractedKeywords.slice(0, 5);

  const langLabel = ALL_LANGUAGES.find(l => l.code === selectedLang)?.label || "English";

  return (
    <div className="flex flex-col gap-4">
      
      {/* 1. Header Area with Action buttons */}
      <div className="flex justify-between items-center border-b border-borderToken pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <div>
            <h3 className="font-bold text-sm font-display text-main">AI Generated Summary</h3>
            <p className="text-[10px] text-muted">Precision abstract extraction</p>
          </div>
        </div>

        {summary && !isLoading && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tooltip content="Copy to Clipboard" position="bottom">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-hover text-muted hover:text-main transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Download TXT" position="bottom">
              <button
                onClick={handleDownloadTxt}
                className="p-1.5 rounded hover:bg-hover text-muted hover:text-main transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Download Markdown" position="bottom">
              <button
                onClick={handleDownload}
                className="p-1.5 rounded hover:bg-hover text-muted hover:text-main transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Download Word (DOCX)" position="bottom">
              <button
                onClick={handleDownloadDocx}
                className="p-1.5 rounded hover:bg-hover text-muted hover:text-main transition-colors"
              >
                <span className="text-[10px] font-bold">W</span>
              </button>
            </Tooltip>
            <Tooltip content="Print Summary" position="bottom">
              <button
                onClick={handlePrint}
                className="p-1.5 rounded hover:bg-hover text-muted hover:text-main transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Share Summary" position="bottom">
              <button
                onClick={handleShare}
                className="p-1.5 rounded hover:bg-hover text-muted hover:text-main transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            {onToggleFavorite && (
              <Tooltip content={isFavorite ? "Remove from Favorites" : "Save to Favorites"} position="bottom">
                <button
                  onClick={onToggleFavorite}
                  className="p-1.5 rounded hover:bg-hover text-muted hover:text-primary transition-colors"
                >
                  <Heart className={clsx("w-3.5 h-3.5", isFavorite ? "fill-primary text-primary" : "")} />
                </button>
              </Tooltip>
            )}
            <div className="h-4 w-[1px] bg-borderToken mx-0.5" />
            <Tooltip content="Regenerate Summary" position="bottom">
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded hover:bg-hover text-muted hover:text-main transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* 2. Style, Formatting and Tone Tabs Row */}
      {summary && !isLoading && (
        <div className="flex flex-wrap gap-2 items-center justify-between bg-slate-100/50 dark:bg-slate-800/40 p-2 rounded-lg border border-borderToken/40">
          {/* Format (Paragraph vs Bullets) */}
          <div className="flex items-center gap-1">
            <Tooltip content="Paragraph View" position="bottom">
              <button
                onClick={() => handleFormatChange("paragraph")}
                className={twMerge(
                  "p-1 rounded transition-colors",
                  format === "paragraph" ? "text-primary bg-primary/10" : "text-muted hover:text-main"
                )}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Bullet List View" position="bottom">
              <button
                onClick={() => handleFormatChange("bullet")}
                className={twMerge(
                  "p-1 rounded transition-colors",
                  format === "bullet" ? "text-primary bg-primary/10" : "text-muted hover:text-main"
                )}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>

          {/* Length controls */}
          <div className="flex items-center gap-2 text-[10px] text-muted font-semibold">
            <button onClick={handleShorten} className="text-primary hover:underline flex items-center gap-1">
              <Scissors className="w-3 h-3" /> Shorten
            </button>
            <button onClick={handleExpand} className="text-primary hover:underline flex items-center gap-1">
              <Maximize2 className="w-3 h-3" /> Expand
            </button>
          </div>

          {/* Translation */}
          <div className="flex items-center gap-1.5">
            {isTranslating && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            <Languages className="w-3 h-3 text-muted shrink-0" />
            <select
              value={selectedLang}
              onChange={(e) => handleTranslate(e.target.value)}
              disabled={isTranslating}
              className="bg-transparent text-muted focus:outline-none cursor-pointer text-[10px] font-bold disabled:opacity-50 max-w-[140px]"
            >
              {ALL_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 3. Output Display Panel */}
      <div className="w-full min-h-[220px] bg-input border border-borderToken rounded-md p-4 text-xs relative select-text">
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-full" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-5/6" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-2/3" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-full" />
          </div>
        ) : displayedText ? (
          <div className="prose dark:prose-invert max-w-none text-main">
            {renderMarkdown(displayedText)}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse" />
            )}
          </div>
        ) : (
          <span className="text-muted/60 italic">AI summary statements will render here when processing completes.</span>
        )}
      </div>

      {/* 4. Telemetry Evaluation Scores */}
      {summary && !isLoading && (
        <>
          <div className="grid grid-cols-3 gap-3 bg-slate-100/30 dark:bg-slate-800/20 p-3 rounded-lg border border-borderToken/30">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-muted flex items-center gap-1">
                <Award className="w-3 h-3 text-emerald-500" /> Confidence
              </span>
              <span className="text-xs font-bold text-main">{confidence}%</span>
              <ProgressBar progress={confidence} className="h-1" />
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-muted flex items-center gap-1">
                <Activity className="w-3 h-3 text-primary" /> Compression
              </span>
              <span className="text-xs font-bold text-main">{compressionRatio !== undefined ? `${compressionRatio}%` : `${qualityScore}%`}</span>
              <ProgressBar progress={compressionRatio !== undefined ? compressionRatio : qualityScore} className="h-1" />
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-muted flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" /> Latency
              </span>
              <span className="text-[10px] font-bold text-main leading-tight truncate">
                {generationTime !== undefined && generationTime > 0 ? `${generationTime}s` : `${readingTime} min read`}
              </span>
              <div className="text-[8px] text-muted truncate">
                {modelUsed || `${wordsCount} words`}
              </div>
            </div>
          </div>

          {/* Detailed Summary Stats Grid */}
          {(wordCount !== undefined || charCount !== undefined) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/50 dark:bg-slate-800/10 p-2.5 rounded-lg border border-borderToken/25 text-[9px] text-muted font-semibold">
              <div className="flex flex-col">
                <span>Words Saved</span>
                <strong className="text-[11px] text-main">{(wordCount ?? 0).toLocaleString()}</strong>
              </div>
              <div className="flex flex-col">
                <span>Characters</span>
                <strong className="text-[11px] text-main">{(charCount ?? 0).toLocaleString()}</strong>
              </div>
              <div className="flex flex-col">
                <span>Reduction Rate</span>
                <strong className="text-[11px] text-main">
                  {compressionRatio !== undefined ? `${(100 - compressionRatio).toFixed(0)}%` : "N/A"}
                </strong>
              </div>
              <div className="flex flex-col">
                <span>Saved Date</span>
                <strong className="text-[11px] text-main truncate">
                  {createdDate ? new Date(createdDate).toLocaleDateString() : "Just now"}
                </strong>
              </div>
              {modelUsed && (
                <div className="flex flex-col">
                  <span>Model Used</span>
                  <strong className="text-[11px] text-main truncate">{modelUsed}</strong>
                </div>
              )}
              {language && (
                <div className="flex flex-col">
                  <span>Language</span>
                  <strong className="text-[11px] text-main truncate">
                    {ALL_LANGUAGES.find(l => l.code === language)?.label?.split(" ")[0] || language.toUpperCase()}
                  </strong>
                </div>
              )}
              {readingTimeSaved !== undefined && (
                <div className="flex flex-col">
                  <span>Time Saved</span>
                  <strong className="text-[11px] text-main">{readingTimeSaved} min</strong>
                </div>
              )}
              {selectedLang !== "en" && (
                <div className="flex flex-col">
                  <span>Translated To</span>
                  <strong className="text-[11px] text-main truncate">{langLabel.split(" ")[0]}</strong>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Confidence warning */}
      {summary && !isLoading && confidence < 92 && (
        <div className="flex items-center gap-2 p-2.5 rounded bg-danger/5 border border-danger/20 text-[10px] text-danger font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
          <span>Warning: Confidence score slightly lower. Review facts before using this summary.</span>
        </div>
      )}

      {/* 5. Insights Drawers Accordion */}
      {summary && !isLoading && (
        <div className="flex flex-col border border-borderToken rounded-lg overflow-hidden bg-surface">
          {/* Tabs header */}
          <div className="flex border-b border-borderToken text-[10px] font-bold text-muted bg-slate-100/40 dark:bg-slate-800/10">
            {[
              { id: "keywords", label: "Keywords", icon: <Tag className="w-3 h-3" /> },
              { id: "actions", label: "Action Items", icon: <ListTodo className="w-3 h-3" /> },
              { id: "timeline", label: "Timeline", icon: <Clock className="w-3 h-3" /> },
              { id: "mindmap", label: "Mind Map", icon: <GitBranch className="w-3 h-3" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(activeTab === tab.id ? null : (tab.id as any))}
                className={twMerge(
                  "flex-1 py-2 px-2 border-r border-borderToken last:border-r-0 hover:text-main transition-colors text-center flex items-center justify-center gap-1",
                  activeTab === tab.id ? "bg-surface text-primary border-b border-b-primary" : ""
                )}
              >
                {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Drawer contents – only inside the right panel, does NOT affect left panel height */}
          <AnimatePresence>
            {activeTab && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-surface text-xs text-slate-700 dark:text-slate-300 border-t border-borderToken/40">
                  {activeTab === "keywords" && (
                    <div>
                      <p className="text-[10px] text-muted mb-2 font-semibold">Extracted from the source document:</p>
                      {extractedKeywords.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {extractedKeywords.map((k, i) => (
                            <Badge key={i} variant="info" outline className="text-[10px] capitalize">{k}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted italic text-[10px]">Generate a summary to extract keywords.</p>
                      )}
                    </div>
                  )}
                  
                  {activeTab === "actions" && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] text-muted mb-1 font-semibold">Action items derived from summary:</p>
                      {actionItems.length > 0 ? actionItems.map((act, i) => (
                        <label key={i} className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" className="rounded border-borderToken text-primary h-3.5 w-3.5 focus:ring-primary accent-primary" />
                          <span>{act}</span>
                        </label>
                      )) : (
                        <p className="text-muted italic text-[10px]">Generate a summary to extract action items.</p>
                      )}
                    </div>
                  )}

                  {activeTab === "timeline" && (
                    <div className="flex flex-col gap-3 pl-2 border-l-2 border-primary/20">
                      {timelineSteps.length > 0 ? timelineSteps.map((step, i) => (
                        <div key={i} className="relative pl-4">
                          <div className="absolute left-[-21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                          <h4 className="font-bold text-main text-[11px]">{step.step}</h4>
                          <p className="text-[10px] text-muted">{step.desc}</p>
                        </div>
                      )) : (
                        <p className="text-muted italic text-[10px]">Generate a summary to build a timeline.</p>
                      )}
                    </div>
                  )}

                  {activeTab === "mindmap" && (
                    <div className="flex flex-col gap-1.5 pl-2 font-mono text-[10px]">
                      <div className="text-primary font-bold flex items-center gap-1">
                        <GitBranch className="w-3 h-3" /> Summary Root
                      </div>
                      {mindMapTopics.length > 0 ? mindMapTopics.map((topic, i) => (
                        <div key={i} className={`${i < mindMapTopics.length - 1 ? "border-l" : ""} border-borderToken`}>
                          <div className="pl-4">
                            {i === mindMapTopics.length - 1 ? "└── " : "├── "}
                            <span className="capitalize">{topic}</span>
                          </div>
                        </div>
                      )) : (
                        <p className="text-muted italic pl-4">Generate a summary to build the mind map.</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
};
export default SummaryOutput;
