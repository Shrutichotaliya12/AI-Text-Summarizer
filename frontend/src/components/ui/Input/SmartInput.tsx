import React, { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  Paperclip, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Mic, 
  MicOff, 
  RotateCcw, 
  RotateCw, 
  AlertTriangle, 
  Info,
  Globe,
  Sparkles,
  Command,
  FileUp,
  FlameKindling
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";
import { AnimatePresence, motion } from "framer-motion";

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export const SmartInput: React.FC<SmartInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Type or paste your document text here...",
  maxLength = 2000,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Undo/Redo Stacks
  const [history, setHistory] = useState<string[]>([value]);
  const [historyPointer, setHistoryPointer] = useState(0);

  // Layout States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Analysis States
  const [lang, setLang] = useState("English");
  const [hasDuplicates, setHasDuplicates] = useState(false);
  const [grammarWarning, setGrammarWarning] = useState(false);

  // Web Speech API reference
  const recognitionRef = useRef<any>(null);

  // Load Auto-Saved Draft on Mount
  useEffect(() => {
    const draft = localStorage.getItem("summarizer_smart_draft");
    if (draft && !value) {
      handleTextUpdate(draft);
    }
  }, []);

  // Real-time Text Analysis (Language, Duplicates, Grammar)
  useEffect(() => {
    if (!value.trim()) {
      setLang("English");
      setHasDuplicates(false);
      setGrammarWarning(false);
      return;
    }

    // 1. Basic Language Detection & Script Support Check
    const textLower = value.toLowerCase();
    const containsChinese = /[\u4e00-\u9fa5]/.test(value);
    const containsCyrillic = /[\u0400-\u04FF]/.test(value);
    const containsArabic = /[\u0600-\u06FF]/.test(value);

    if (containsChinese) {
      setLang("Chinese (Unsupported)");
    } else if (containsCyrillic) {
      setLang("Russian (Unsupported)");
    } else if (containsArabic) {
      setLang("Arabic (Unsupported)");
    } else if (textLower.match(/\b(le|la|et|une|est)\b/)) {
      setLang("French");
    } else if (textLower.match(/\b(el|la|y|es|una|con)\b/)) {
      setLang("Spanish");
    } else if (textLower.match(/\b(der|die|das|und|ist|ein)\b/)) {
      setLang("German");
    } else if (value.match(/[\u0900-\u097F]/)) { // Devnagari script range
      setLang("Hindi");
    } else {
      setLang("English");
    }

    // 2. Duplicate Sentence Detector (sentences > 15 chars matching each other)
    const sentences = value.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 15);
    const uniqueSentences = new Set(sentences);
    setHasDuplicates(sentences.length !== uniqueSentences.size);

    // 3. Simple Grammar Scan (sentence not starting with uppercase)
    const rawSentences = value.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
    const badCaps = rawSentences.some(s => s[0] && s[0] !== s[0].toUpperCase());
    setGrammarWarning(badCaps);

  }, [value]);

  // Handle Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (e: any) => {
        let transcript = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            transcript += e.results[i][0].transcript;
          }
        }
        if (transcript) {
          handleTextUpdate(value + (value ? " " : "") + transcript);
        }
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, [value]);

  // Key Down Events (Ctrl+Enter, Undo/Redo shortcuts)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl + Enter to submit
    if (modifier && e.key === "Enter") {
      e.preventDefault();
      if (onSubmit && value.trim() && !disabled) {
        onSubmit();
      }
    }

    // Ctrl + Z to undo
    if (modifier && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }

    // Ctrl + Y or Ctrl + Shift + Z to redo
    if ((modifier && e.key.toLowerCase() === "y") || (modifier && e.shiftKey && e.key.toLowerCase() === "z")) {
      e.preventDefault();
      handleRedo();
    }
  };

  // State update wrapper updating stacks & saves
  const handleTextUpdate = (text: string) => {
    const cleanText = text.slice(0, maxLength);
    onChange(cleanText);
    localStorage.setItem("summarizer_smart_draft", cleanText);

    // Typing activity indicator
    setIsTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 800);

    // Save history slice
    const newHistory = history.slice(0, historyPointer + 1);
    // Limit stack depth to 50
    if (newHistory.length >= 50) {
      newHistory.shift();
    }
    setHistory([...newHistory, cleanText]);
    setHistoryPointer(newHistory.length);
  };

  const handleUndo = () => {
    if (historyPointer > 0) {
      const nextPointer = historyPointer - 1;
      setHistoryPointer(nextPointer);
      onChange(history[nextPointer]);
    }
  };

  const handleRedo = () => {
    if (historyPointer < history.length - 1) {
      const nextPointer = historyPointer + 1;
      setHistoryPointer(nextPointer);
      onChange(history[nextPointer]);
    }
  };

  // Drag and Drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      readFileData(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFileData(file);
    }
  };

  const readFileData = (file: File) => {
    const isText = file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md");
    if (!isText) {
      toastError("Only plain text (.txt) and Markdown (.md) files are supported directly in the browser.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        handleTextUpdate(text);
        success("Document Uploaded Successfully");
      }
    };
    reader.readAsText(file);
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toastError("Voice input is not supported in this browser. Please try Google Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const clearText = () => {
    setShowClearConfirm(true);
  };

  // Word & Reading Time Metrics
  const getWordCount = () => {
    if (!value.trim()) return 0;
    return value.trim().split(/\s+/).length;
  };

  const getSentenceCount = () => {
    if (!value.trim()) return 0;
    return value.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  };

  const getParagraphCount = () => {
    if (!value.trim()) return 0;
    return value.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  };

  const getReadingTime = () => {
    const words = getWordCount();
    if (words === 0) return 0;
    return Math.ceil(words / 200); // 200 WPM
  };

  const isLimitApproaching = value.length >= maxLength - 200;

  const EditorLayout = (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={twMerge(
        "flex-1 flex flex-col gap-3 rounded-lg border p-4 bg-surface transition-all relative overflow-hidden",
        isDragOver ? "border-primary bg-primary/5 ring-2 ring-primary/20 scale-[0.99]" : "border-borderToken",
        isFullscreen ? "h-full w-full max-w-4xl mx-auto" : "min-h-[300px]"
      )}
    >
      {/* Editor top menu actions */}
      <div className="flex justify-between items-center border-b border-borderToken/60 pb-2 text-muted">
        <div className="flex items-center gap-1">
          <Tooltip content="Undo (Ctrl+Z)">
            <button
              onClick={handleUndo}
              disabled={historyPointer === 0}
              className="p-1.5 rounded hover:bg-hover hover:text-main disabled:opacity-40 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Redo (Ctrl+Y)">
            <button
              onClick={handleRedo}
              disabled={historyPointer === history.length - 1}
              className="p-1.5 rounded hover:bg-hover hover:text-main disabled:opacity-40 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <div className="h-4 w-[1px] bg-borderToken mx-1" />
          <Tooltip content="Upload text document (.txt/.md)">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded hover:bg-hover hover:text-main transition-colors"
            >
              <FileUp className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Tooltip content={isListening ? "Stop Voice Input" : "Start Voice Input"}>
            <button
              onClick={toggleVoiceInput}
              className={twMerge(
                "p-1.5 rounded hover:bg-hover transition-colors",
                isListening ? "text-danger bg-danger/10 animate-pulse" : "hover:text-main"
              )}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          {/* Status indicators */}
          {isTyping && (
            <span className="text-[10px] italic text-primary font-bold animate-pulse">Typing...</span>
          )}
          
          <Tooltip content={lang.includes("Unsupported") ? "Detected language is currently unsupported. Summarization accuracy may be degraded." : "Language detected automatically"}>
            <Badge variant={lang.includes("Unsupported") ? "danger" : "primary"} className="text-[9px] gap-1 py-0.5 border-transparent">
              <Globe className="w-2.5 h-2.5" /> {lang}
            </Badge>
          </Tooltip>

          <div className="h-4 w-[1px] bg-borderToken mx-1" />

          <Tooltip content="Clear Draft">
            <button
              onClick={clearText}
              disabled={!value}
              className="p-1.5 rounded hover:bg-danger/10 hover:text-danger disabled:opacity-40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content={isFullscreen ? "Exit Fullscreen" : "Fullscreen Focus"}>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded hover:bg-hover hover:text-main transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Main Textarea input */}
      <textarea
        value={value}
        onChange={(e) => handleTextUpdate(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full flex-1 bg-transparent text-main text-xs leading-relaxed focus:outline-none resize-none min-h-[160px]"
      />

      {/* Warnings & Diagnostics alerts layout */}
      <div className="flex flex-col gap-1">
        {hasDuplicates && (
          <div className="flex items-center gap-1.5 text-[10px] text-warning font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Warning: Repeated sentences detected in input document text.</span>
          </div>
        )}
        {grammarWarning && (
          <div className="flex items-center gap-1.5 text-[10px] text-info font-semibold">
            <Info className="w-3.5 h-3.5" />
            <span>Style note: Some sentences do not start with a capital letter.</span>
          </div>
        )}
      </div>

      {/* Drag & drop overlay target indicators */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/5 flex items-center justify-center pointer-events-none select-none">
          <div className="bg-surface border border-primary p-4 rounded-xl shadow-lg flex flex-col items-center gap-2 scale-95 transition-all">
            <Paperclip className="w-8 h-8 text-primary animate-bounce" />
            <span className="text-xs font-bold text-main">Drop text document to read</span>
          </div>
        </div>
      )}

      {/* Footer Metrics Row */}
      <div className="flex justify-between items-center border-t border-borderToken/60 pt-2.5 text-[10px] text-muted font-semibold">
        <div className="flex flex-wrap items-center gap-3">
          <span>Words: <strong className="text-main">{getWordCount()}</strong></span>
          <span>Sentences: <strong className="text-main">{getSentenceCount()}</strong></span>
          <span>Paragraphs: <strong className="text-main">{getParagraphCount()}</strong></span>
          <span>Reading Time: <strong className="text-main">{getReadingTime()}m</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx(
            isLimitApproaching ? "text-danger" : "text-muted"
          )}>
            {value.length} / {maxLength} chars
          </span>
          {onSubmit && value.trim() && (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[8px] bg-slate-100 dark:bg-slate-800 px-1 border border-borderToken rounded pointer-events-none">
              <Command className="w-2.5 h-2.5" /> Enter
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* If fullscreen, mount in portal modal view */}
      {isFullscreen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md">
          {EditorLayout}
        </div>
      ) : (
        EditorLayout
      )}
      {/* Clear Draft Confirm Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface p-6 rounded-xl border border-warning/30 shadow-premium z-10 flex flex-col gap-4 text-xs"
            >
              <div className="flex items-center gap-2.5 text-warning">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
                <h3 className="font-bold text-xs font-display">Clear Draft?</h3>
              </div>

              <p className="leading-relaxed text-muted dark:text-slate-300">
                Are you sure you want to clear your current draft? This action cannot be undone.
              </p>

              <div className="flex gap-2.5 mt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 text-[10px] border-borderToken"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    handleTextUpdate("");
                    success("Document Deleted Successfully");
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 text-[10px] bg-warning hover:bg-warning/80 text-white border-transparent"
                >
                  Clear Draft
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
export default SmartInput;
