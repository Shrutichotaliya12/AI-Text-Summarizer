import React, { useState, useEffect } from "react";
import { Download, Play, Square, FileText, Settings, X, Database, Zap, HardDrive, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/api";
import { Spinner } from "@/components";

interface AIModel {
  id: string;
  name: string;
  architecture: string;
  capabilities: string;
  quality_score: number;
  speed: string;
  latency: string;
  context_length: string;
  memory_usage: string;
  recommended_use: string;
  best_doc_type: string;
  expected_quality: string;
  accuracy: number;
  memory: string;
  rouge: string;
  bleu: number;
  bertScore: number;
  size: string;
  downloadStatus: "downloaded" | "not_downloaded";
  availability: "active" | "inactive";
  parameters: string;
  supported_languages: string;
  performance: string;
  documentation_url: string;
  installation_guide: string;
}

export const ModelCatalog: React.FC = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const { success, error } = useToast();

  const fetchModels = async () => {
    try {
      const res = await apiClient.get("/models/available");
      setModels(res.data.models || []);
    } catch (err) {
      error("Failed to load AI Models");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleDownload = async (modelId: string) => {
    try {
      await apiClient.post(`/models/download/${modelId}`);
      success("Model downloaded successfully.");
      fetchModels();
      if (selectedModel?.id === modelId) {
        setSelectedModel(prev => prev ? { ...prev, downloadStatus: "downloaded", availability: "active" } : null);
      }
    } catch (err) {
      error("Download failed.");
    }
  };

  const handleActivate = async (modelId: string) => {
    try {
      await apiClient.post(`/models/activate/${modelId}`);
      success("Model activated.");
      fetchModels();
      if (selectedModel?.id === modelId) {
        setSelectedModel(prev => prev ? { ...prev, availability: "active" } : null);
      }
    } catch (err) {
      error("Activation failed.");
    }
  };

  const handleDeactivate = async (modelId: string) => {
    try {
      await apiClient.post(`/models/deactivate/${modelId}`);
      success("Model deactivated.");
      fetchModels();
      if (selectedModel?.id === modelId) {
        setSelectedModel(prev => prev ? { ...prev, availability: "inactive" } : null);
      }
    } catch (err) {
      error("Deactivation failed.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 relative h-full">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold font-display text-main">AI Model Catalog</h2>
        <p className="text-xs text-muted">
          Browse, download, and manage the AI models available on your system.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map(model => (
          <Card 
            key={model.id} 
            className="flex flex-col gap-4 cursor-pointer hover:border-primary/50 transition-colors group"
            onClick={() => setSelectedModel(model)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-main font-display text-base group-hover:text-primary transition-colors">{model.name}</h3>
                <p className="text-[10px] text-muted">{model.architecture}</p>
              </div>
              <Badge variant={model.availability === "active" ? "primary" : "secondary"}>
                {model.availability === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[10px]">
              <div className="flex flex-col">
                <span className="text-muted flex items-center gap-1"><Settings className="w-3 h-3"/> Parameters</span>
                <span className="font-semibold text-main">{model.parameters}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Accuracy</span>
                <span className="font-semibold text-main">{model.accuracy}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted flex items-center gap-1"><Zap className="w-3 h-3"/> Latency</span>
                <span className="font-semibold text-main">{model.latency}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted flex items-center gap-1"><HardDrive className="w-3 h-3"/> Memory</span>
                <span className="font-semibold text-main">{model.memory_usage}</span>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-borderToken flex justify-between items-center text-[10px]">
              <span className="text-muted">Size: {model.size}</span>
              <span className="text-primary font-semibold group-hover:underline">View Details &rarr;</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Right Drawer */}
      {selectedModel && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedModel(null)}
          />
          <div className="fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-surface shadow-2xl z-50 border-l border-borderToken flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-6 flex flex-col gap-6">
              
              {/* Drawer Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold font-display text-main">{selectedModel.name}</h2>
                  <p className="text-xs text-muted mt-1">{selectedModel.architecture}</p>
                </div>
                <button 
                  onClick={() => setSelectedModel(null)}
                  className="p-2 bg-input rounded-full hover:bg-hover text-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-borderToken bg-input text-xs">
                <span className="font-semibold text-main flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Status
                </span>
                <Badge variant={selectedModel.availability === "active" ? "primary" : selectedModel.downloadStatus === "downloaded" ? "info" : "secondary"}>
                  {selectedModel.availability === "active" ? "Activated" : selectedModel.downloadStatus === "downloaded" ? "Downloaded (Inactive)" : "Not Downloaded"}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {selectedModel.downloadStatus !== "downloaded" ? (
                  <Button className="flex-1 gap-2 text-xs" onClick={() => handleDownload(selectedModel.id)}>
                    <Download className="w-4 h-4" /> Download Model
                  </Button>
                ) : selectedModel.availability === "inactive" ? (
                  <Button className="flex-1 gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleActivate(selectedModel.id)}>
                    <Play className="w-4 h-4" /> Activate Model
                  </Button>
                ) : (
                  <Button className="flex-1 gap-2 text-xs" variant="outline" onClick={() => handleDeactivate(selectedModel.id)}>
                    <Square className="w-4 h-4" /> Deactivate Model
                  </Button>
                )}
              </div>

              <div className="h-px bg-borderToken w-full" />

              {/* Specifications */}
              <div>
                <h3 className="font-bold text-sm text-main mb-4 border-b border-borderToken pb-2">Specifications</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-muted">Parameters</span>
                    <span className="font-semibold text-main">{selectedModel.parameters}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted">Supported Languages</span>
                    <span className="font-semibold text-main">{selectedModel.supported_languages}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted">Accuracy (Quality)</span>
                    <span className="font-semibold text-main">{selectedModel.accuracy}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted">Latency</span>
                    <span className="font-semibold text-main">{selectedModel.latency}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted">Memory Usage</span>
                    <span className="font-semibold text-main">{selectedModel.memory_usage}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted">Performance Level</span>
                    <span className="font-semibold text-main">{selectedModel.performance}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted">Context Length</span>
                    <span className="font-semibold text-main">{selectedModel.context_length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted">File Size</span>
                    <span className="font-semibold text-main">{selectedModel.size}</span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div>
                <h3 className="font-bold text-sm text-main mb-4 border-b border-borderToken pb-2">Evaluation Metrics</h3>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="p-2 border border-borderToken rounded bg-input">
                    <span className="block text-muted text-[10px]">ROUGE (1/2/L)</span>
                    <span className="font-semibold text-main">{selectedModel.rouge}</span>
                  </div>
                  <div className="p-2 border border-borderToken rounded bg-input">
                    <span className="block text-muted text-[10px]">BLEU</span>
                    <span className="font-semibold text-main">{selectedModel.bleu}</span>
                  </div>
                  <div className="p-2 border border-borderToken rounded bg-input">
                    <span className="block text-muted text-[10px]">BERTScore</span>
                    <span className="font-semibold text-main">{selectedModel.bertScore}</span>
                  </div>
                </div>
              </div>

              {/* Documentation */}
              <div className="flex flex-col gap-3 pb-8">
                <h3 className="font-bold text-sm text-main border-b border-borderToken pb-2">Resources</h3>
                
                <a href={selectedModel.documentation_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded border border-borderToken hover:bg-hover transition-colors">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-main">Documentation</span>
                    <span className="text-[10px] text-muted">Read the official HuggingFace docs</span>
                  </div>
                </a>

                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-xs font-semibold text-main">Installation Guide</span>
                  <div className="bg-slate-900 dark:bg-black text-slate-200 text-xs p-3 rounded-md font-mono overflow-x-auto relative group">
                    <code>{selectedModel.installation_guide}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
