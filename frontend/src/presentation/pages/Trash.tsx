import React, { useState, useEffect } from "react";
import { Trash2, RotateCcw, Search, AlertCircle, File, Database, Calendar, AlertTriangle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/api";
import { useToast } from "@/context/ToastContext";

interface TrashDocument {
  id: string;
  name: string;
  size: string;
  type: string;
  wordCount: number;
  charCount: number;
  uploadTime: string;
  deletedAt: string;
}

export const Trash: React.FC = () => {
  const [documents, setDocuments] = useState<TrashDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "deletedAt">("deletedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Custom Modal confirm states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const { success, error: toastError } = useToast();

  const fetchTrashDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/upload/trash");
      setDocuments(response.data.documents || []);
    } catch (err) {
      console.error("Failed to load trash documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashDocuments();
  }, []);

  const handleRestore = async (id: string) => {
    try {
      await apiClient.post(`/upload/${id}/restore`);
      success("Document Uploaded Successfully"); // Map restore to successful upload/restore status
      fetchTrashDocuments();
    } catch (error) {
      toastError("Failed to restore document.");
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await apiClient.delete(`/upload/${deleteConfirmId}/permanent`);
      success("Document Deleted Successfully");
      setDeleteConfirmId(null);
      fetchTrashDocuments();
    } catch (error) {
      toastError("Failed to permanently delete document.");
    }
  };

  const handleSort = (key: "name" | "deletedAt") => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const filteredDocs = documents
    .filter(doc => doc.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a: any, b: any) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (sortKey === "deletedAt") {
        valA = new Date(a.deletedAt).getTime();
        valB = new Date(b.deletedAt).getTime();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div className="flex flex-col gap-6 p-6 select-none max-w-4xl mx-auto w-full">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold font-display text-main tracking-tight flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-danger" /> Trash Bin
        </h1>
        <p className="text-[10px] text-muted leading-relaxed">
          View soft-deleted files. Deleted documents will remain in the trash for exactly 30 days before being permanently purged.
        </p>
      </div>

      <Card className="p-4 border border-borderToken bg-surface shadow-premium flex flex-col gap-4">
        
        {/* Warning Indicator */}
        <div className="flex items-center gap-2.5 p-3 rounded-lg border border-warning/30 bg-warning/5 text-warning-hover text-[10px] leading-relaxed">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Notice:</strong> Automatically deletes after 30 days. You can restore your files back to the Workspace or delete them permanently.
          </span>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex items-center flex-1">
            <Search className="absolute left-3 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Search deleted files..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-app border border-borderToken rounded-lg text-xs text-main placeholder-muted/80 focus:outline-none focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleSort("name")}
              className={`text-[10px] flex-1 sm:flex-none border-borderToken ${sortKey === "name" ? "bg-hover font-bold text-main" : "text-muted"}`}
            >
              Sort by Name {sortKey === "name" && (sortOrder === "asc" ? "↑" : "↓")}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleSort("deletedAt")}
              className={`text-[10px] flex-1 sm:flex-none border-borderToken ${sortKey === "deletedAt" ? "bg-hover font-bold text-main" : "text-muted"}`}
            >
              Sort by Date {sortKey === "deletedAt" && (sortOrder === "asc" ? "↑" : "↓")}
            </Button>
          </div>
        </div>

        {/* Deleted files list */}
        {loading ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <span className="text-[10px] text-muted font-semibold uppercase tracking-wider">Loading trash...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2 text-muted">
            <File className="w-8 h-8 opacity-40" />
            <span className="text-[10px]">No deleted documents found matching your filter criteria.</span>
          </div>
        ) : (
          <div className="flex flex-col border border-borderToken/65 rounded-lg divide-y divide-borderToken/35 overflow-hidden">
            {filteredDocs.map((doc) => (
              <div 
                key={doc.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-hover/30 transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-lg bg-danger/10 text-danger shrink-0">
                    <File className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-main text-xs truncate">{doc.name}</span>
                    <span className="text-[10px] text-muted font-mono flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-primary" /> {doc.size} &bull; {doc.wordCount} words
                    </span>
                  </div>
                </div>

                <div className="flex flex-row items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 border-borderToken/35 pt-2.5 sm:pt-0">
                  <div className="flex flex-col gap-0.5 text-[9px] text-muted">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Deleted:</span>
                    <span className="font-mono">{new Date(doc.deletedAt).toLocaleDateString()} {new Date(doc.deletedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button 
                      onClick={() => handleRestore(doc.id)} 
                      size="sm" 
                      variant="outline" 
                      className="text-[10px] gap-1 px-3 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </Button>
                    <Button 
                      onClick={() => { setDeleteConfirmId(doc.id); setDeleteConfirmName(doc.name); }} 
                      size="sm" 
                      variant="outline" 
                      className="text-[10px] gap-1 px-3 border-danger/30 text-danger hover:bg-danger hover:text-white"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                    </Button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </Card>

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
                  <h3 className="font-bold text-xs font-display">Delete Permanently</h3>
                </div>
                <button onClick={() => setDeleteConfirmId(null)} className="text-muted hover:text-main">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                Are you sure you want to permanently delete <strong className="text-main">"{deleteConfirmName}"</strong>? This action is irreversible.
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
                  onClick={handlePermanentDelete}
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

export default Trash;
