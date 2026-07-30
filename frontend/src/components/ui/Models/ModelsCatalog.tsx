import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { twMerge } from "tailwind-merge";
import { 
  Download, 
  CheckCircle, 
  Activity, 
  Cpu, 
  Database, 
  Clock, 
  FileCode,
  Check,
  Search,
  Filter
} from "lucide-react";
import { useModelStore, ModelMetadata } from "@/state";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

export const ModelsCatalog: React.FC = () => {
  const { models, selectedModelId, setSelectedModelId, startModelDownload } = useModelStore();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "downloaded" | "cloud">("all");

  const handleCardClick = (model: ModelMetadata) => {
    if (model.downloadStatus === "downloaded" && model.availability === "active") {
      setSelectedModelId(model.id);
    } else if (model.downloadStatus === "not_downloaded") {
      if (window.confirm(`Would you like to download ${model.name} (${model.size}) to local storage?`)) {
        startModelDownload(model.id);
      }
    }
  };

  // Filter model listings
  const filteredModels = models.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    if (filterType === "downloaded") {
      return matchesSearch && m.downloadStatus === "downloaded";
    }
    if (filterType === "cloud") {
      return matchesSearch && m.downloadStatus === "not_downloaded";
    }
    return matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-surface border border-borderToken/80 p-4 rounded-xl shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search AI models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-app border border-borderToken rounded-md pl-9 pr-4 py-2 text-xs text-main focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        <div className="flex gap-1.5 w-full sm:w-auto shrink-0 justify-end">
          {[
            { id: "all", label: "All Models" },
            { id: "downloaded", label: "Downloaded" },
            { id: "cloud", label: "In Cloud" }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilterType(opt.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                filterType === opt.id
                  ? "bg-primary text-white border-transparent"
                  : "bg-surface border-borderToken text-muted hover:text-main"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredModels.map((model) => {
          const isSelected = selectedModelId === model.id;
          const isDownloaded = model.downloadStatus === "downloaded";
          const isDownloading = model.downloadStatus === "downloading";

          return (
            <motion.div
              key={model.id}
              layout
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              onClick={() => handleCardClick(model)}
              className={twMerge(
                "relative group cursor-pointer select-none rounded-xl transition-all duration-300",
                isSelected ? "ring-2 ring-primary" : "hover:scale-[1.01]"
              )}
            >
              <Card 
                hoverGlow 
                className={twMerge(
                  "p-5 flex flex-col gap-4 h-full border border-borderToken/80 bg-surface",
                  isSelected ? "border-primary/50 shadow-glow" : ""
                )}
              >
                {/* Header row */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-bold text-sm text-main font-display">{model.name}</h3>
                    <Badge variant={isDownloaded ? "success" : isDownloading ? "warning" : "secondary"} className="w-fit text-[9px] py-0.5 border-transparent">
                      {isDownloaded ? "Local / Ready" : isDownloading ? `Downloading ${model.progress}%` : "In Cloud"}
                    </Badge>
                  </div>
                  
                  {isSelected && (
                    <div className="bg-primary text-white p-1 rounded-full shadow-sm">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* Accuracy & Speed Progress Section */}
                <div className="flex flex-col gap-2.5 border-t border-b border-borderToken/50 py-3 text-[10px] text-muted">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between font-semibold">
                      <span>Semantic Accuracy</span>
                      <span className="text-main font-bold">{model.accuracy}%</span>
                    </div>
                    <ProgressBar progress={model.accuracy} className="h-1.5" />
                  </div>

                  <div className="flex justify-between items-center text-[10px]">
                    <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-primary" /> Speed</span>
                    <span className="font-bold text-main">{model.speed}</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px]">
                    <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-indigo-500" /> VRAM / Memory</span>
                    <span className="font-bold text-main">{model.memory}</span>
                  </div>
                </div>

                {/* NLP Metrics & Storage */}
                <div className="flex flex-col gap-1.5 text-[10px] text-muted">
                  <div className="flex justify-between">
                    <span>ROUGE-1 / 2 / L</span>
                    <span className="font-semibold text-main">{model.rouge}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BLEU / BERTScore</span>
                    <span className="font-semibold text-main">{model.bleu} / {model.bertScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latency</span>
                    <span className="font-semibold text-main flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> {model.latency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model Weight Size</span>
                    <span className="font-semibold text-main flex items-center gap-1"><Database className="w-3 h-3 text-slate-400" /> {model.size}</span>
                  </div>
                </div>

                {/* Download State Actions */}
                <AnimatePresence>
                  {!isDownloaded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-2 pt-2 border-t border-borderToken/30"
                    >
                      {isDownloading ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-[9px] font-bold text-primary animate-pulse">
                            <span>Downloading weights...</span>
                            <span>{model.progress}%</span>
                          </div>
                          <ProgressBar progress={model.progress || 0} className="h-1.5" />
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-[10px] gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            startModelDownload(model.id);
                          }}
                        >
                          <Download className="w-3 h-3" /> Download Model
                        </Button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
};
export default ModelsCatalog;
