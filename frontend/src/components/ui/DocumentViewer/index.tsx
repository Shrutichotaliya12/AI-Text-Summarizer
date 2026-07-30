import React, { useState, useEffect } from "react";
import { X, Pencil, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/api";

interface DocumentViewerProps {
  doc: any;
  onClose: () => void;
  onSave: (docId: string, name: string, text: string) => Promise<void>;
  onOpenWorkspace: (doc: any) => void;
  getFileIcon: (type: string) => React.ReactNode;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  doc,
  onClose,
  onSave,
  onOpenWorkspace,
  getFileIcon
}) => {
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editedDocText, setEditedDocText] = useState("");
  const [editedDocName, setEditedDocName] = useState("");

  useEffect(() => {
    if (doc) {
      setEditedDocText(doc.extractedText || "");
      setEditedDocName(doc.display_name || doc.name || "");
      setIsEditingDoc(false);
    }
  }, [doc]);

  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6 animate-fadeIn">
      <div className="bg-surface border border-borderToken rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-borderToken">
          <div className="flex items-center gap-3 flex-1">
            {getFileIcon(doc.type)}
            {isEditingDoc ? (
              <input
                type="text"
                value={editedDocName}
                onChange={(e) => setEditedDocName(e.target.value)}
                className="font-bold text-sm bg-slate-50 dark:bg-slate-800/40 border border-borderToken rounded px-2.5 py-1 text-main w-full max-w-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter document display name"
              />
            ) : (
              <div>
                <h3 className="font-bold text-sm text-main truncate max-w-[400px]">
                  {doc.display_name || doc.name}
                </h3>
                <p className="text-[10px] text-muted">
                  {doc.size} • Format: {doc.type.toUpperCase()} • {doc.wordCount} words
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-hover text-muted hover:text-main transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/10">
          {["png", "jpeg", "jpg", "webp"].includes(doc.type.toLowerCase()) ? (
            <div className="flex items-center justify-center h-full max-h-[50vh]">
              <img
                src={`${apiClient.defaults.baseURL}/upload/${doc.id}/download`}
                alt={doc.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-md border border-borderToken"
              />
            </div>
          ) : ["pdf", "html"].includes(doc.type.toLowerCase()) && !isEditingDoc ? (
            <div className="w-full h-full min-h-[50vh] rounded-lg overflow-hidden border border-borderToken">
              <iframe 
                src={`${apiClient.defaults.baseURL}/upload/${doc.id}/download`}
                title={doc.name}
                className="w-full h-full bg-white"
              />
            </div>
          ) : doc.type.toLowerCase() === "csv" && !isEditingDoc ? (
            <div className="overflow-x-auto border border-borderToken rounded-lg bg-surface">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/40 border-b border-borderToken">
                    {editedDocText.split("\n")[0]?.split(",").map((col, idx) => (
                      <th key={idx} className="p-3 font-semibold text-muted">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editedDocText.split("\n").slice(1, 15).map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-borderToken/50 hover:bg-hover/10">
                      {row.split(",").map((cell, cIdx) => (
                        <td key={cIdx} className="p-3 text-main">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {editedDocText.split("\n").length > 15 && (
                <div className="p-3 text-center text-[10px] text-muted border-t border-borderToken">
                  Showing first 15 rows of {editedDocText.split("\n").length} total rows
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] text-muted">
                <span>{isEditingDoc ? "Editable Document Editor" : "Document Extracted Text View"}</span>
                {!["txt", "md", "csv", "json", "html"].includes(doc.type.toLowerCase()) && (
                  <span className="text-warning">Read-only (binary format)</span>
                )}
              </div>
              {isEditingDoc ? (
                <textarea
                  value={editedDocText}
                  onChange={(e) => setEditedDocText(e.target.value)}
                  className="flex-1 min-h-[40vh] w-full p-4 border border-borderToken rounded-xl bg-surface text-main text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                />
              ) : (
                <pre className="flex-1 p-4 border border-borderToken rounded-xl bg-surface text-main text-xs font-mono overflow-auto whitespace-pre-wrap leading-relaxed select-text">
                  {editedDocText || "No text content available."}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-borderToken bg-surface flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="text-[11px] h-9 border-borderToken"
            >
              Close
            </Button>
            {["txt", "md", "csv", "json", "html"].includes(doc.type.toLowerCase()) && (
              <Button
                variant="outline"
                className="text-[11px] h-9 gap-1.5 border-borderToken"
                onClick={() => setIsEditingDoc(!isEditingDoc)}
              >
                <Pencil className="w-3.5 h-3.5" />
                {isEditingDoc ? "Cancel Edit" : "Edit Content"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {isEditingDoc && (
              <Button
                onClick={() => onSave(doc.id, editedDocName, editedDocText).then(() => setIsEditingDoc(false))}
                className="text-[11px] h-9 gap-1.5"
              >
                Save Changes
              </Button>
            )}
            <Button
              onClick={() => onOpenWorkspace(doc)}
              className="text-[11px] h-9 gap-1.5"
            >
              Load Workspace <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
