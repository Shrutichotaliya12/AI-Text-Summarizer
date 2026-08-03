import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileUp, 
  Globe, 
  Youtube, 
  Trash2, 
  Eye, 
  CheckCircle, 
  Clock, 
  FileText, 
  Table, 
  Music, 
  Image as ImageIcon,
  Database,
  ArrowRight,
  Sparkles,
  Link as LinkIcon,
  ChevronRight,
  Heart,
  Pencil,
  X,
  Grid,
  List,
  FileDown,
  Copy,
  Plus,
  RefreshCw,
  FileWarning,
  Undo2,
  Trash,
  Search
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { twMerge } from "tailwind-merge";
import { useModelStore, useDocumentStore, DocumentData } from "@/state";
import { useTranslation } from "@/context/TranslationContext";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/api";
import { DocumentViewer } from "@/components";

interface UploadedFile {
  id: string;
  name: string;
  display_name?: string;
  size: string;
  type: string;
  wordCount: number;
  charCount?: number;
  extractedText: string;
  isFavorite?: boolean;
  uploadTime?: string;
  lastModified?: string;
  status: "uploading" | "failed" | "completed" | "processing";
  progress?: number;
  tags?: string[];
  notes?: string;
  pageCount?: number;
  abortController?: AbortController;
  fileObject?: File;
  error?: string;
}

// Convert DocumentData to UploadedFile if needed, or update the interface

export const DocumentUpload: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setCurrentDocument, incrementSessionDocuments } = useModelStore();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"library" | "upload" | "trash">("library");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState("upload_time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Documents state
  const { documents: documentsList, totalDocuments: totalCount, fetchDocuments, updateDocument, setDocuments } = useDocumentStore();
  const [trashList, setTrashList] = useState<any[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  
  // Built-in Viewer & Editor states
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editedDocText, setEditedDocText] = useState("");
  const [editedDocName, setEditedDocName] = useState("");

  // Loading state for document text
  const [isLoadingDocText, setIsLoadingDocText] = useState(false);


  // URL input states
  const [urlInput, setUrlInput] = useState("");
  const [urlType, setUrlType] = useState<"web" | "youtube">("web");

  // Detail edit states (for preview sidebar drawer)
  const [newTagName, setNewTagName] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const fetchTrash = async () => {
    let interval: ReturnType<typeof setInterval> | undefined;
    try {
      const response = await apiClient.get("/upload/trash");
      if (response.data && response.data.documents) {
        setTrashList(response.data.documents);
      }
    } catch (error) {
      console.error("Failed to fetch trash:", error);
    }
  };

  // Sync parameters & refresh
  useEffect(() => {
    fetchDocuments(searchQuery, filterType, currentPage, pageSize, sortBy, sortOrder);
    fetchTrash();
  }, [activeTab, searchQuery, filterType, sortBy, sortOrder, currentPage, fetchDocuments]);

  // Fetch single document text on-demand
  const fetchDocumentText = async (doc: any): Promise<any> => {
    if (doc.extractedText && doc.extractedText.length > 0) return doc;
    try {
      const res = await apiClient.get(`/upload/document/${doc.id}`);
      return { ...doc, extractedText: res.data.text || "", wordCount: res.data.wordCount || doc.wordCount, charCount: res.data.charCount || doc.charCount };
    } catch {
      return doc;
    }
  };

  // Auto-fetch text when previewFile is set and text is missing
  useEffect(() => {
    if (previewFile && !previewFile.extractedText) {
      setIsLoadingDocText(true);
      fetchDocumentText(previewFile).then(fullDoc => {
        setPreviewFile(fullDoc);
        updateDocument(fullDoc.id, fullDoc);
        setIsLoadingDocText(false);
      });
    } else {
      setIsLoadingDocText(false);
    }
  }, [previewFile?.id]);

  useEffect(() => {
    if (viewingDoc) {
      // If text not loaded yet, fetch it
      if (!viewingDoc.extractedText) {
        fetchDocumentText(viewingDoc).then(fullDoc => {
          setViewingDoc(fullDoc);
          setEditedDocText(fullDoc.extractedText || "");
          setEditedDocName(fullDoc.display_name || fullDoc.name || "");
        });
      } else {
        setEditedDocText(viewingDoc.extractedText || "");
        setEditedDocName(viewingDoc.display_name || viewingDoc.name || "");
      }
      setIsEditingDoc(false);
    }
  }, [viewingDoc?.id]);

  // Determine Icon based on format
  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "docx":
      case "doc":
        return <FileText className="w-5 h-5 text-indigo-500" />;
      case "xlsx":
      case "xls":
        return <Table className="w-5 h-5 text-emerald-500" />;
      case "csv":
        return <Table className="w-5 h-5 text-teal-500" />;
      case "json":
        return <FileText className="w-5 h-5 text-amber-500" />;
      case "txt":
      case "md":
        return <FileText className="w-5 h-5 text-primary" />;
      case "png":
      case "jpg":
      case "jpeg":
      case "webp":
        return <ImageIcon className="w-5 h-5 text-purple-500" />;
      case "youtube":
      case "audio":
        return <Youtube className="w-5 h-5 text-danger animate-pulse" />;
      case "web":
      case "html":
        return <Globe className="w-5 h-5 text-emerald-500" />;
      default:
        return <FileText className="w-5 h-5 text-muted" />;
    }
  };

  // Drag over handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      queueFilesForUpload(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      queueFilesForUpload(files);
    }
  };

  // Setup queue items and run uploads
  const queueFilesForUpload = (files: File[]) => {
    setActiveTab("upload");
    const newItems = files.map(file => {
      const extension = file.name.split(".").pop() || "txt";
      const sizeMB = file.size / (1024 * 1024);
      const sizeStr = sizeMB > 0.9 ? `${sizeMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
      const id = "queue-item-" + Math.random().toString(36).substring(2, 9);
      
      const abortController = new AbortController();
      
      return {
        id,
        name: file.name,
        size: sizeStr,
        type: extension,
        wordCount: 0,
        extractedText: "",
        status: "uploading" as const,
        progress: 10,
        abortController,
        fileObject: file
      };
    });

    setUploadQueue((prev: any) => [...newItems, ...prev]);
    newItems.forEach(item => uploadSingleFile(item));
  };

  // Asynchronous document upload with cancel/abort support
  const uploadSingleFile = async (item: UploadedFile) => {
    if (!item.fileObject) return;
    
    let interval: NodeJS.Timeout | undefined;

    try {
      const formData = new FormData();
      formData.append("file", item.fileObject);

      // Fake upload progression increment
      let progress = 10;
      interval = setInterval(() => {
        if (progress < 90) {
          progress += 10;
          setUploadQueue((prev: any) => prev.map((q: any) => q.id === item.id ? { ...q, progress } : q));
        }
      }, 150);

      const response = await apiClient.post("/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        signal: item.abortController?.signal
      });

      clearInterval(interval);
      success(`Successfully uploaded ${item.name}`);
      
      // Update queue to completed status and switch to library tab if queue is empty
      setUploadQueue((prev: any) => {
        const remaining = prev.filter((q: any) => q.id !== item.id);
        if (remaining.length === 0) {
          setActiveTab("library");
        }
        return remaining;
      });
      
      incrementSessionDocuments();
      fetchDocuments(searchQuery, filterType, currentPage, pageSize, sortBy, sortOrder);
    } catch (error: any) {
      clearInterval(interval);
      if (error?.name === "CanceledError" || error?.message === "canceled") {
        setUploadQueue((prev: any) => {
          const remaining = prev.filter((q: any) => q.id !== item.id);
          if (remaining.length === 0) {
            setActiveTab("library");
          }
          return remaining;
        });
        return;
      }
      const errMsg = error?.response?.data?.detail || "Upload failed. Try again.";
      setUploadQueue((prev: any) => prev.map((q: any) => q.id === item.id ? { ...q, status: "failed", error: errMsg, progress: 100 } : q));
      toastError(`${item.name}: ${errMsg}`);
    }
  };

  const handleCancelUpload = (id: string) => {
    const item = uploadQueue.find((q: any) => q.id === id);
    if (item && item.abortController) {
      item.abortController.abort();
      success(`Canceled upload of ${item.name}`);
    }
  };

  const handleRetryUpload = (id: string) => {
    const item = uploadQueue.find((q: any) => q.id === id);
    if (item && item.fileObject) {
      const abortController = new AbortController();
      setUploadQueue((prev: any) => prev.map((q: any) => q.id === id ? { ...q, status: "uploading", progress: 10, abortController } : q));
      uploadSingleFile({ ...item, abortController });
    }
  };

  // URL Scraper submission
  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    setActiveTab("upload");
    const newId = "url-temp-" + Math.random().toString(36).substring(2, 9);
    const domain = urlInput.replace("https://", "").replace("http://", "").split("/")[0];
    
    const tempUpload: UploadedFile = {
      id: newId,
      name: urlType === "web" ? `Web Scrape: ${domain}` : "YouTube Transcript",
      size: "URL Link",
      type: urlType === "web" ? "web" : "youtube",
      progress: 20,
      status: "uploading",
      wordCount: 0,
      extractedText: ""
    };
    setUploadQueue((prev: any) => [tempUpload, ...prev]);
    const requestedUrl = urlInput;
    setUrlInput("");

    try {
      const response = await apiClient.post("/upload/scrape", {
        url: requestedUrl,
        type: urlType
      });

      success(`Successfully scraped ${domain}`);
      setUploadQueue((prev: any) => prev.filter((u: any) => u.id !== newId));
      fetchDocuments(searchQuery, filterType, currentPage, pageSize, sortBy, sortOrder);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || "Failed to fetch transcript.";
      setUploadQueue((prev: any) => prev.map((u: any) => u.id === newId ? { ...u, status: "failed", error: msg, progress: 100 } : u));
    }
  };

  // Document metadata actions
  const handleToggleFavorite = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const nextFav = !item.isFavorite;
      await apiClient.put(`/upload/${item.id}`, { is_favorite: nextFav });
      updateDocument(item.id, { isFavorite: nextFav });
      if (previewFile && previewFile.id === item.id) {
        setPreviewFile((prev: any) => prev ? { ...prev, isFavorite: nextFav } : null);
      }
      success(nextFav ? "Saved to Favorites" : "Removed from Favorites");
    } catch (error: any) {
      toastError("Failed to update favorite status.");
    }
  };

  const handleRename = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = window.prompt("Enter new display name for document:", item.display_name || item.name);
    if (newName && newName.trim() && newName !== (item.display_name || item.name)) {
      try {
        await apiClient.put(`/upload/${item.id}`, { display_name: newName.trim() });
        updateDocument(item.id, { display_name: newName.trim() });
        if (previewFile && previewFile.id === item.id) {
          setPreviewFile((prev: any) => prev ? { ...prev, display_name: newName.trim() } : null);
        }
        success("Document renamed successfully.");
        fetchDocuments(searchQuery, filterType, currentPage, pageSize, sortBy, sortOrder);
      } catch (error: any) {
        toastError("Failed to rename document.");
      }
    }
  };

  const handleSoftDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/upload/${id}`);
      setDocuments(documentsList.filter((d: any) => d.id !== id));
      if (previewFile && previewFile.id === id) {
        setPreviewFile(null);
      }
      success("Document moved to Recycle Bin.");
      fetchDocuments(searchQuery, filterType, currentPage, pageSize, sortBy, sortOrder);
      fetchTrash();
    } catch (error) {
      toastError("Failed to delete document.");
    }
  };

  // Trash actions
  const handleRestoreTrash = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/upload/${id}/restore`);
      setTrashList((prev: any) => prev.filter((t: any) => t.id !== id));
      success("Document restored successfully.");
      fetchDocuments(searchQuery, filterType, currentPage, pageSize, sortBy, sortOrder);
      fetchTrash();
    } catch (error) {
      toastError("Failed to restore document.");
    }
  };

  const handlePermanentDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Permanently delete this document? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/upload/${id}/permanent`);
      setTrashList((prev: any) => prev.filter((t: any) => t.id !== id));
      success("Document permanently deleted.");
      fetchDocuments(searchQuery, filterType, currentPage, pageSize, sortBy, sortOrder);
      fetchTrash();
    } catch (error) {
      toastError("Failed to delete document.");
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("Empty the entire Recycle Bin? All deleted files will be lost forever.")) return;
    try {
      await apiClient.delete("/upload/trash/empty");
      setTrashList([]);
      success("Recycle Bin emptied successfully.");
      fetchDocuments(searchQuery, filterType, currentPage, pageSize, sortBy, sortOrder);
      fetchTrash();
    } catch (error) {
      toastError("Failed to empty Recycle Bin.");
    }
  };

  // File download original binary handler
  const handleDownloadOriginal = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`${apiClient.defaults.baseURL}/upload/${item.id}/download`, "_blank");
    success("Downloading original file contents.");
  };

  // Copy extracted text to clipboard
  const handleCopyText = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.extractedText);
    success("Extracted text copied to clipboard.");
  };

  // Open Document: Sets active document in workspace store and redirects home
  const handleOpenDocument = (item: any) => {
    setCurrentDocument({
      id: item.id,
      text: item.extractedText,
      name: item.display_name || item.name,
      size: item.size,
      type: item.type,
      uploadTime: item.uploadTime || new Date().toLocaleTimeString(),
      wordCount: item.wordCount,
      charCount: item.charCount || item.extractedText.length
    });
    setPreviewFile(null);
    success(`Document "${item.display_name || item.name}" loaded into Workspace.`);
    navigate("/");
  };

  const handleSaveDocument = async () => {
    if (!viewingDoc) return;
    try {
      await apiClient.put(`/upload/${viewingDoc.id}`, {
        display_name: editedDocName.trim(),
        text: editedDocText
      });
      
      updateDocument(viewingDoc.id, { 
        display_name: editedDocName.trim(), 
        text: editedDocText, 
        wordCount: editedDocText.split(/\s+/).length 
      });
      
      setViewingDoc((prev: any) => prev ? { 
        ...prev, 
        display_name: editedDocName.trim(), 
        extractedText: editedDocText, 
        wordCount: editedDocText.split(/\s+/).length 
      } : null);
      
      setIsEditingDoc(false);
      success("Document saved successfully.");
      fetchDocuments(searchQuery, filterType, currentPage, pageSize, sortBy, sortOrder);
    } catch (error) {
      toastError("Failed to save document.");
    }
  };

  // Add tag to document
  const handleAddTag = async () => {
    if (!previewFile || !newTagName.trim()) return;
    const currentTags = previewFile.tags || [];
    if (currentTags.includes(newTagName.trim())) {
      setNewTagName("");
      return;
    }
    const updatedTags = [...currentTags, newTagName.trim()];
    try {
      const tagsStr = updatedTags.join(",");
      await apiClient.put(`/upload/${previewFile.id}`, { tags: tagsStr });
      setPreviewFile((prev: any) => prev ? { ...prev, tags: updatedTags } : null);
      updateDocument(previewFile.id, { tags: updatedTags });
      setNewTagName("");
      success("Tag added successfully.");
    } catch (error) {
      toastError("Failed to add tag.");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!previewFile) return;
    const currentTags = previewFile.tags || [];
    const updatedTags = currentTags.filter((t: any) => t !== tagToRemove);
    try {
      const tagsStr = updatedTags.join(",");
      await apiClient.put(`/upload/${previewFile.id}`, { tags: tagsStr });
      setPreviewFile((prev: any) => prev ? { ...prev, tags: updatedTags } : null);
      updateDocument(previewFile.id, { tags: updatedTags });
      success("Tag removed.");
    } catch (error) {
      toastError("Failed to remove tag.");
    }
  };

  const handleSaveNotes = async () => {
    if (!previewFile) return;
    try {
      await apiClient.put(`/upload/${previewFile.id}`, { notes: notesDraft });
      setPreviewFile((prev: any) => prev ? { ...prev, notes: notesDraft } : null);
      updateDocument(previewFile.id, { notes: notesDraft });
      setIsEditingNotes(false);
      success("Notes updated.");
    } catch (error) {
      toastError("Failed to save notes.");
    }
  };

  const handleStartNotesEdit = () => {
    setNotesDraft(previewFile?.notes || "");
    setIsEditingNotes(true);
  };

  // Computed parameters
  const pageCountTotal = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. Header with title and tab selection */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold font-display text-main">Document Management</h2>
          <p className="text-xs text-muted">Upload, organize, preview, and query your knowledge repository documents</p>
        </div>

        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800/40 p-1.5 rounded-xl border border-borderToken/50 w-full sm:w-auto">
          {[
            { id: "library", label: `Library Catalog (${totalCount})` },
            { id: "upload", label: `Upload Queue (${uploadQueue.length})` },
            { id: "trash", label: `Recycle Bin (${trashList.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={twMerge(
                "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm border-transparent"
                  : "text-muted hover:text-main"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Drag and Drop Input Area (Always available at the top for catalog uploads) */}
      {activeTab !== "trash" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={handleDrop}
            className="md:col-span-2 border-2 border-dashed border-borderToken/80 hover:border-primary/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 bg-surface hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition-all cursor-pointer text-center min-h-[140px]"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <FileUp className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-main">Drag & Drop Files Here</h4>
              <p className="text-[10px] text-muted mt-0.5">Supports PDF, DOCX, DOC, TXT, CSV, XLS, XLSX, MD, HTML, JSON, PNG, JPEG, WEBP (Max 50MB per file)</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <Card className="p-4 flex flex-col gap-3.5 bg-surface border border-borderToken">
            <div className="flex justify-between items-center border-b border-borderToken/50 pb-1.5">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">URL Link Scraper</span>
              <div className="flex gap-0.5 bg-app border border-borderToken rounded-lg p-0.5">
                <button
                  onClick={() => setUrlType("web")}
                  className={twMerge(
                    "px-2 py-0.5 rounded text-[8px] font-bold transition-all",
                    urlType === "web" ? "bg-primary text-white" : "text-muted"
                  )}
                >
                  Web
                </button>
                <button
                  onClick={() => setUrlType("youtube")}
                  className={twMerge(
                    "px-2 py-0.5 rounded text-[8px] font-bold transition-all",
                    urlType === "youtube" ? "bg-primary text-white" : "text-muted"
                  )}
                >
                  YouTube
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={urlType === "web" ? "Enter webpage URL..." : "Enter YouTube video link..."}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 bg-app border border-borderToken rounded-lg px-2.5 py-1.5 text-xs text-main placeholder-muted/80 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              <Button onClick={handleUrlSubmit} disabled={!urlInput.trim()} className="text-[11px] px-3.5 py-1.5">
                Fetch <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </Card>

        </div>
      )}

      {/* 3. Catalog Catalog Library Dashboard */}
      {activeTab === "library" && (
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          
          {/* Filters, search, and catalog layout toggles */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5 pb-4 border-b border-borderToken/55">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search by name, tags, or extracted content..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-app border border-borderToken rounded-lg pl-9 pr-4 py-2 text-xs text-main focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type filtering */}
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="bg-app border border-borderToken rounded-lg px-3 py-2 text-xs text-muted font-semibold focus:outline-none"
              >
                <option value="all">All Formats</option>
                <option value="pdf">PDF Documents</option>
                <option value="docx">Word (.docx)</option>
                <option value="txt">Text & Markdown</option>
                <option value="favorites">Favorites</option>
                <option value="large">Large Files (&gt;1MB)</option>
                <option value="recent_upload">Recently Uploaded</option>
              </select>

              {/* Sorting */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-app border border-borderToken rounded-lg px-3 py-2 text-xs text-muted font-semibold focus:outline-none"
              >
                <option value="upload_time">Upload Date</option>
                <option value="lastModified">Last Modified</option>
                <option value="wordCount">Words Count</option>
                <option value="name">File Name</option>
              </select>

              {/* Sort order */}
              <button
                onClick={() => setSortOrder((prev: any) => prev === "asc" ? "desc" : "asc")}
                className="p-2 border border-borderToken rounded-lg bg-app text-muted hover:text-main"
              >
                <span className="text-xs font-bold">{sortOrder.toUpperCase()}</span>
              </button>

              <div className="h-6 w-[1px] bg-borderToken mx-1" />

              {/* View Layout Mode toggle */}
              <div className="flex border border-borderToken rounded-lg overflow-hidden bg-app">
                <button
                  onClick={() => setViewMode("grid")}
                  className={twMerge("p-2 text-muted hover:text-main transition-colors", viewMode === "grid" ? "bg-primary text-white hover:text-white" : "")}
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={twMerge("p-2 text-muted hover:text-main transition-colors", viewMode === "list" ? "bg-primary text-white hover:text-white" : "")}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Documents catalog display rendering */}
          {documentsList.length === 0 ? (
            <div className="text-center py-12 text-muted italic text-xs">
              No matching documents found in your library catalog. Drop files to upload above.
            </div>
          ) : viewMode === "grid" ? (
            // Grid view
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {documentsList.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setPreviewFile(doc)}
                  className="group relative flex flex-col justify-between p-4 rounded-xl border border-borderToken hover:border-primary/40 hover:shadow-premium bg-surface transition-all duration-300 cursor-pointer select-none"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      {getFileIcon(doc.type)}
                      <button
                        onClick={(e) => handleToggleFavorite(doc, e)}
                        className="p-1 rounded text-muted hover:text-red-500 transition-colors"
                      >
                        <Heart className={twMerge("w-3.5 h-3.5", doc.isFavorite ? "fill-red-500 text-red-500" : "")} />
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-0.5">
                      <h4 className="font-bold text-xs text-main truncate font-display" title={doc.display_name || doc.name}>
                        {doc.display_name || doc.name}
                      </h4>
                      <span className="text-[9px] text-muted">
                        Size: <strong>{doc.size}</strong> &bull; Words: <strong>{doc.wordCount}</strong>
                      </span>
                    </div>

                    {/* Tag list */}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {doc.tags.slice(0, 3).map((tag: any) => (
                          <Badge key={tag} variant="secondary" className="text-[8px] py-0 px-1 border-transparent max-w-[60px] truncate">
                            {tag}
                          </Badge>
                        ))}
                        {doc.tags.length > 3 && (
                          <span className="text-[8px] text-muted">+{doc.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-borderToken/50 mt-4 pt-2.5 text-[9px] text-muted">
                    <span>{new Date(doc.uploadTime || "").toLocaleDateString()}</span>
                    
                    {/* Hover actions row */}
                    <div className="hidden group-hover:flex items-center gap-1">
                      <Tooltip content="View / Edit Document">
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewingDoc(doc); }}
                          className="p-1 rounded bg-hover text-muted hover:text-primary transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Download Original">
                        <button
                          onClick={(e) => handleDownloadOriginal(doc, e)}
                          className="p-1 rounded bg-hover text-muted hover:text-main transition-colors"
                        >
                          <FileDown className="w-3 h-3" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete to Recycle Bin">
                        <button
                          onClick={(e) => handleSoftDelete(doc.id, e)}
                          className="p-1 rounded bg-danger/10 text-muted hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List view
            <div className="flex flex-col gap-2">
              {documentsList.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setPreviewFile(doc)}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-borderToken hover:border-primary/30 hover:shadow-premium bg-surface transition-all cursor-pointer group select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {getFileIcon(doc.type)}
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-bold text-xs text-main truncate font-display max-w-[240px]">
                        {doc.display_name || doc.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-[9px] text-muted mt-0.5">
                        <span>Size: <strong>{doc.size}</strong></span>
                        <span>&bull;</span>
                        <span>Words: <strong>{doc.wordCount}</strong></span>
                        {doc.tags && doc.tags.length > 0 && (
                          <>
                            <span>&bull;</span>
                            <div className="flex gap-1">
                              {doc.tags.map((t: any) => (
                                <span key={t} className="bg-slate-100 dark:bg-slate-800 px-1 rounded-sm text-[8px]">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted mr-2 hidden sm:inline-block">
                      {new Date(doc.uploadTime || "").toLocaleDateString()}
                    </span>

                    <button
                      onClick={(e) => handleToggleFavorite(doc, e)}
                      className="p-1.5 rounded hover:bg-hover text-muted hover:text-red-500"
                    >
                      <Heart className={twMerge("w-3.5 h-3.5", doc.isFavorite ? "fill-red-500 text-red-500" : "")} />
                    </button>

                    <Tooltip content="View / Edit Document">
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewingDoc(doc); }}
                        className="p-1.5 rounded hover:bg-hover text-muted hover:text-primary"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>

                    <button
                      onClick={(e) => handleRename(doc, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-hover text-muted hover:text-main transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleSoftDelete(doc.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-danger/10 text-muted hover:text-danger transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Library pagination controls */}
          {pageCountTotal > 1 && (
            <div className="flex justify-between items-center border-t border-borderToken/50 pt-4 mt-2">
              <span className="text-[10px] text-muted">
                Showing documents <strong>{((currentPage - 1) * pageSize) + 1}</strong> - <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev: any) => Math.max(1, prev - 1))}
                  className="text-[10px] py-1 h-7 border-borderToken"
                >
                  Previous
                </Button>
                <span className="text-xs font-bold text-main">{currentPage} / {pageCountTotal}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === pageCountTotal}
                  onClick={() => setCurrentPage((prev: any) => Math.min(pageCountTotal, prev + 1))}
                  className="text-[10px] py-1 h-7 border-borderToken"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

        </Card>
      )}

      {/* 4. Upload Queue Tab Panel */}
      {activeTab === "upload" && (
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken/50 pb-2">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Active Upload Stream Queue</span>
            <span className="text-[10px] font-bold text-muted">{uploadQueue.length} files total</span>
          </div>

          {uploadQueue.length === 0 ? (
            <div className="text-center py-12 text-muted/65 italic text-xs">
              No files currently transferring in the queue stream. Select or drop files above to start transfers.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {uploadQueue.map(item => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 p-4 rounded-xl border border-borderToken/55 bg-slate-50/20 dark:bg-slate-800/10"
                >
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {getFileIcon(item.type)}
                      <span className="font-semibold text-main truncate max-w-sm" title={item.name}>{item.name}</span>
                      <span className="text-[9px] text-muted">({item.size})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === "uploading" && (
                        <>
                          <Badge variant="primary" className="text-[8px] py-0.5 border-transparent animate-pulse">
                            Transferring {item.progress}%
                          </Badge>
                          <button
                            onClick={() => handleCancelUpload(item.id)}
                            className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      
                      {item.status === "failed" && (
                        <>
                          <Badge variant="danger" className="text-[8px] py-0.5 border-transparent">
                            Failed
                          </Badge>
                          <button
                            onClick={() => handleRetryUpload(item.id)}
                            className="p-1 rounded bg-hover text-muted hover:text-main"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {item.status === "uploading" && (
                    <ProgressBar progress={item.progress || 0} />
                  )}

                  {item.status === "failed" && item.error && (
                    <div className="flex items-center gap-1.5 text-[9px] text-danger font-semibold">
                      <FileWarning className="w-3 h-3" />
                      <span>{item.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 5. Recycle Bin Tab Panel */}
      {activeTab === "trash" && (
        <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken/50 pb-2">
            <div>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Recycle Bin Repository</span>
              <p className="text-[9px] text-muted mt-0.5">Documents deleted will clear automatically based on your Settings days retention cutoff.</p>
            </div>

            {trashList.length > 0 && (
              <Button
                onClick={handleEmptyTrash}
                className="text-[10px] py-1 px-3 h-8 bg-danger hover:bg-danger/80 border-transparent text-white"
              >
                <Trash className="w-3.5 h-3.5 mr-1" /> Empty Bin
              </Button>
            )}
          </div>

          {trashList.length === 0 ? (
            <div className="text-center py-12 text-muted italic text-xs">
              Recycle Bin is currently empty.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {trashList.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-borderToken/65 bg-surface hover:border-danger/35 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {getFileIcon(item.type)}
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-bold text-xs text-main truncate font-display">{item.name}</h4>
                      <span className="text-[9px] text-muted">
                        Deleted: {new Date(item.deletedAt).toLocaleDateString()} &bull; Size: {item.size}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Tooltip content="Restore Document">
                      <button
                        onClick={(e) => handleRestoreTrash(item.id, e)}
                        className="p-1.5 rounded hover:bg-hover text-muted hover:text-primary"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>

                    <Tooltip content="Delete Forever">
                      <button
                        onClick={(e) => handlePermanentDelete(item.id, e)}
                        className="p-1.5 rounded hover:bg-danger/10 text-muted hover:text-danger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 6. Slide-out Preview Drawer Overlay Portal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setPreviewFile(null); setIsEditingNotes(false); }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="relative w-full max-w-lg bg-surface h-full shadow-premium p-6 border-l border-borderToken flex flex-col justify-between z-10"
            >
              <div className="flex flex-col gap-4 h-full overflow-hidden">
                <div className="flex justify-between items-start border-b border-borderToken/80 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(previewFile.type)}
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-main font-display truncate max-w-[280px]" title={previewFile.display_name || previewFile.name}>
                        {previewFile.display_name || previewFile.name}
                      </h3>
                      <p className="text-[10px] text-muted">{previewFile.size} &bull; Type: {previewFile.type.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={(e) => handleToggleFavorite(previewFile, e)} 
                      className="p-1.5 rounded-md hover:bg-hover text-muted hover:text-red-500 transition-colors"
                    >
                      <Heart className={`w-4 h-4 ${previewFile.isFavorite ? "fill-red-500 text-red-500" : "text-muted"}`} />
                    </button>
                    <button onClick={() => { setPreviewFile(null); setIsEditingNotes(false); }} className="p-1.5 rounded-md hover:bg-hover text-muted hover:text-main">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metadata details block grid */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50/60 dark:bg-slate-800/10 p-3 rounded-lg border border-borderToken/35 text-[10px] text-muted font-semibold">
                  <div className="flex flex-col">
                    <span>Uploaded Date</span>
                    <strong className="text-main mt-0.5">{new Date(previewFile.uploadTime || "").toLocaleDateString()}</strong>
                  </div>
                  <div className="flex flex-col">
                    <span>Estimated Read Time</span>
                    <strong className="text-main mt-0.5">{Math.max(1, Math.ceil(previewFile.wordCount / 200))} min</strong>
                  </div>
                  <div className="flex flex-col">
                    <span>Words Count</span>
                    <strong className="text-main mt-0.5">{previewFile.wordCount}</strong>
                  </div>
                  <div className="flex flex-col">
                    <span>Characters Count</span>
                    <strong className="text-main mt-0.5">{previewFile.charCount || previewFile.extractedText.length}</strong>
                  </div>
                  {previewFile.type.toLowerCase() === "pdf" && (
                    <div className="flex flex-col">
                      <span>Total PDF Pages</span>
                      <strong className="text-main mt-0.5">{previewFile.pageCount} pages</strong>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span>Unique Document ID</span>
                    <strong className="text-main mt-0.5 select-all font-mono truncate">{previewFile.id}</strong>
                  </div>
                </div>

                {/* Tags management row block */}
                <div className="flex flex-col gap-1.5 pb-2.5 border-b border-borderToken/40">
                  <span className="text-[10px] font-bold text-muted uppercase">Meta Tags</span>
                  <div className="flex flex-wrap gap-1 items-center">
                    {previewFile.tags && previewFile.tags.map((tag: any) => (
                      <span 
                        key={tag} 
                        className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] text-main font-semibold"
                      >
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="text-muted hover:text-danger text-[8px] font-bold">x</button>
                      </span>
                    ))}
                    
                    <div className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        placeholder="Add Tag..."
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAddTag()}
                        className="bg-transparent border border-borderToken rounded px-1.5 py-0.5 text-[9px] text-main focus:outline-none w-[70px]"
                      />
                      <button onClick={handleAddTag} className="p-0.5 bg-primary text-white rounded hover:bg-primary/80">
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes manager */}
                <div className="flex flex-col gap-1.5 pb-2.5 border-b border-borderToken/40">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted uppercase">Personal Notes</span>
                    {isEditingNotes ? (
                      <div className="flex gap-1.5">
                        <button onClick={handleSaveNotes} className="text-[10px] font-bold text-emerald-500">Save</button>
                        <button onClick={() => setIsEditingNotes(false)} className="text-[10px] font-bold text-muted">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={handleStartNotesEdit} className="text-[10px] font-bold text-primary">Edit Notes</button>
                    )}
                  </div>

                  {isEditingNotes ? (
                    <textarea
                      value={notesDraft}
                      onChange={e => setNotesDraft(e.target.value)}
                      className="w-full bg-app border border-borderToken rounded-lg p-2.5 text-xs text-main focus:outline-none h-16 resize-none"
                    />
                  ) : (
                    <p className="text-xs text-muted leading-relaxed italic p-2 bg-slate-50/50 dark:bg-slate-800/10 rounded-lg">
                      {previewFile.notes || "Write down summaries highlights, context cues, or custom remarks..."}
                    </p>
                  )}
                </div>

                {/* Extracted Text Preview area */}
                <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
                  <span className="text-[10px] font-bold text-muted uppercase">Extracted Text Content</span>
                  <div className="flex-1 overflow-y-auto bg-app border border-borderToken rounded-lg p-4 text-xs font-mono leading-relaxed text-main whitespace-pre-wrap select-text min-h-[80px]">
                    {isLoadingDocText ? (
                      <div className="flex items-center gap-2 text-muted italic">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading document text…</span>
                      </div>
                    ) : previewFile.extractedText || (
                      <span className="text-muted italic">No text content available for this document type. Use the View button to open it.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Programmatic action buttons footer */}
              <div className="flex flex-wrap gap-2 mt-5">
                <Button 
                  variant="outline" 
                  className="flex-1 text-[11px] py-2 h-9 border-borderToken"
                  onClick={() => setPreviewFile(null)}
                >
                  Close Preview
                </Button>
                
                <Tooltip content="Download Original Binary">
                  <Button
                    variant="outline"
                    className="p-2 border border-borderToken"
                    onClick={(e) => handleDownloadOriginal(previewFile, e)}
                  >
                    <FileDown className="w-4 h-4 text-muted" />
                  </Button>
                </Tooltip>

                <Tooltip content="Copy Extracted Content">
                  <Button
                    variant="outline"
                    className="p-2 border border-borderToken"
                    onClick={(e) => handleCopyText(previewFile, e)}
                  >
                    <Copy className="w-4 h-4 text-muted" />
                  </Button>
                </Tooltip>

                <Button 
                  className="flex-1 text-[11px] py-2 h-9 gap-1.5"
                  onClick={() => handleOpenDocument(previewFile)}
                >
                  Load Workspace <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Built-in Document Viewer & Editor Modal */}
      <DocumentViewer
        doc={viewingDoc}
        onClose={() => setViewingDoc(null)}
        onSave={async (docId, name, text) => {
          await apiClient.put(`/upload/${docId}`, { display_name: name.trim(), text });
          updateDocument(docId, { 
            display_name: name.trim(), 
            text, 
            wordCount: text.split(/\s+/).length 
          });
          setViewingDoc((prev: any) => prev ? { 
            ...prev, 
            display_name: name.trim(), 
            extractedText: text, 
            wordCount: text.split(/\s+/).length 
          } : null);
          success("Document saved successfully.");
          fetchDocuments(searchQuery, filterType, currentPage, pageSize, sortBy, sortOrder);
        }}
        onOpenWorkspace={handleOpenDocument}
        getFileIcon={getFileIcon}
      />
    </div>
  );
};

export default DocumentUpload;
