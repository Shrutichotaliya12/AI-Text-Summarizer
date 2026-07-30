import React, { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { 
  Cpu, 
  Database, 
  Activity, 
  FileText, 
  Users, 
  FileCode, 
  Clock, 
  Zap, 
  Sparkles,
  Download,
  AlertTriangle,
  Server,
  Layers,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Award
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useTranslation } from "@/context/TranslationContext";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/api";
import { twMerge } from "tailwind-merge";

interface OverviewMetrics {
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  docsProcessedToday: number;
  totalSummaries: number;
  summariesGeneratedToday: number;

  avgSummaryLength: number;
  avgCompressionRatio: number;
  avgRougeScore: number;
  avgResponseTime: number;
  avgProcessingTime: number;
  avgDocumentSize: string;
  storageUsed: string;
  storageRemaining: string;
  storageUsedPct: number;
}

interface ModelPerf {
  modelName: string;
  requests: number;
  successRate: number;
  failureRate: number;
  avgResponseTime: number;
  avgCompression: number;
  avgRouge: number;
  avgRating: number;
}

interface SystemHealth {
  cpu: number;
  ram: number;
  disk: number;
  apiResponseTime: string;
  dbQueryTime: string;
  queueStatus: string;
  cacheHitRatio: string;
}

interface AlertItem {
  id: string;
  type: string;
  title: string;
  message: string;
}

interface TimelineItem {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export const Performance: React.FC = () => {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModel, setFilterModel] = useState("all");
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // auto refresh every 30 seconds

  // State payloads from backend API
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [modelsList, setModelsList] = useState<ModelPerf[]>([]);
  const [docStats, setDocStats] = useState<any>(null);
  const [sumStats, setSumStats] = useState<any>(null);

  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  const fetchPerformanceStats = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/analytics/performance");
      const d = response.data;
      setOverview(d.overview);
      setModelsList(d.modelPerformance || []);
      setDocStats(d.documentAnalytics);
      setSumStats(d.summaryAnalytics);

      setHealth(d.systemHealth);
      setAlerts(d.alerts || []);
      setTimeline(d.timeline || []);
    } catch (error) {
      console.error("Failed to load performance metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceStats();
  }, []);

  // Auto-refresh interval trigger
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      fetchPerformanceStats();
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval]);

  const handleExport = (format: string) => {
    window.open(`${apiClient.defaults.baseURL}/analytics/performance/export?format=${format}`, "_blank");
    success(`Downloading Performance Report as ${format.toUpperCase()}`);
  };

  // ApexCharts Configurations
  // 1. Models requests comparison chart
  const modelChartOptions: ApexOptions = {
    chart: { id: "model-usage-donut", fontFamily: "Poppins, Inter, sans-serif" },
    colors: ["#5b6bff", "#10b981", "#ff4560", "#feb019"],
    labels: modelsList.map(m => m.modelName),
    stroke: { show: false },
    legend: { position: "bottom", labels: { colors: "var(--muted)" } },
    tooltip: { theme: "dark" }
  };

  const modelChartSeries = modelsList.length > 0 
    ? modelsList.map(m => m.requests || 1)
    : [24, 18, 12, 5];

  // 2. Health Gauges option (mock series if not fully loaded)
  const healthRadialOptions: ApexOptions = {
    chart: { id: "health-radial", fontFamily: "Poppins, Inter, sans-serif" },
    colors: ["#5b6bff", "#10b981", "#ff4560"],
    plotOptions: {
      radialBar: {
        dataLabels: {
          name: { fontSize: "14px" },
          value: { fontSize: "12px", color: "var(--main)" },
          total: {
            show: true,
            label: "System",
            formatter: () => "ONLINE"
          }
        }
      }
    },
    labels: ["CPU Usage", "RAM Usage", "Disk Space"],
    legend: { show: false }
  };

  const healthRadialSeries = health 
    ? [health.cpu, health.ram, health.disk]
    : [14.0, 42.0, 31.0];

  return (
    <div className="flex flex-col gap-6 text-xs select-none">
      
      {/* Header bar controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold font-display text-main">System Performance telemetry</h2>
          <p className="text-xs text-muted">Monitor database cache metrics, NLP inferences, file capacities, and health alerts.</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/10 px-2.5 py-1.5 rounded-lg border border-borderToken">
            <span className="text-[10px] text-muted">Refresh:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent border-none text-[10px] text-muted font-bold focus:outline-none cursor-pointer"
            >
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={0}>Manual</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={fetchPerformanceStats} disabled={loading} className="text-[11px]">
            <RefreshCw className={twMerge("w-3 h-3 mr-1", loading && "animate-spin")} /> Reload
          </Button>

          <Button variant="primary" size="sm" onClick={() => handleExport("json")} className="text-[11px]">
            <Download className="w-3 h-3 mr-1" /> Export Report
          </Button>
        </div>
      </div>

      {/* Active System Warnings */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.map(al => (
            <div 
              key={al.id} 
              className={twMerge(
                "p-3.5 rounded-xl border flex gap-3 items-start",
                al.type === "danger" 
                  ? "bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-400"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400"
              )}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                <strong className="font-bold text-xs">{al.title}</strong>
                <span className="text-[11px] opacity-90">{al.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overview stats cards grid */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Summaries", value: overview.totalSummaries, sub: `Generated: ${overview.summariesGeneratedToday} today`, icon: <FileCode className="w-4 h-4 text-primary" /> },
            { label: "Active Documents", value: overview.totalDocuments, sub: `Uploads: ${overview.docsProcessedToday} today`, icon: <FileText className="w-4 h-4 text-emerald-500" /> },

            { label: "Avg ROUGE Score", value: `${overview.avgRougeScore}%`, sub: "Linguistic overlap", icon: <Award className="w-4 h-4 text-pink-500" /> },
            { label: "Avg Latency Speed", value: `${overview.avgResponseTime}s`, sub: "Model inference mean", icon: <Clock className="w-4 h-4 text-cyan-500" /> },
            { label: "Avg Compression", value: `${overview.avgCompressionRatio}%`, sub: "Summary length shrink", icon: <Zap className="w-4 h-4 text-amber-500" /> },
            { label: "Active Users", value: overview.activeUsers, sub: `Total: ${overview.totalUsers} profiles`, icon: <Users className="w-4 h-4 text-violet-500" /> },
            { label: "Storage Space", value: overview.storageUsed, sub: `Available: ${overview.storageRemaining}`, icon: <Database className="w-4 h-4 text-slate-400" /> }
          ].map((card, idx) => (
            <Card key={idx} className="p-4 bg-surface border border-borderToken flex flex-col gap-2 hover:shadow-premium transition-all">
              <div className="flex justify-between items-center text-muted">
                <span className="text-[9px] font-bold uppercase tracking-tight">{card.label}</span>
                {card.icon}
              </div>
              <div className="flex flex-col">
                <strong className="text-base font-extrabold text-main font-display">{card.value}</strong>
                <span className="text-[8px] text-muted/85 font-semibold mt-0.5">{card.sub}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Resource Monitor radial metrics */}
        <Card className="lg:col-span-1 p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div>
              <h3 className="font-bold text-xs font-display text-main">System Resource Monitors</h3>
              <p className="text-[9px] text-muted">Real-time memory and processing telemetry diagnostics</p>
            </div>
            <Server className="w-4 h-4 text-primary" />
          </div>

          <div className="h-[240px] flex items-center justify-center">
            <ReactApexChart options={healthRadialOptions} series={healthRadialSeries} type="radialBar" height="100%" />
          </div>

          {health && (
            <div className="flex flex-col gap-2 border-t border-borderToken/35 pt-4 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-muted">Database Query Latency:</span>
                <span className="text-main font-bold">{health.dbQueryTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">API Endpoint Ping:</span>
                <span className="text-main font-bold">{health.apiResponseTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Cache Hit Efficiency:</span>
                <span className="text-emerald-500 font-bold">{health.cacheHitRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Queue Status:</span>
                <span className="text-primary font-bold">{health.queueStatus}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Models comparison requests */}
        <Card className="lg:col-span-1 p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div>
              <h3 className="font-bold text-xs font-display text-main">Model Usage Distribution</h3>
              <p className="text-[9px] text-muted">Sum of incoming evaluation requests by framework weights</p>
            </div>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="h-[260px] flex items-center justify-center">
            <ReactApexChart options={modelChartOptions} series={modelChartSeries} type="donut" width="100%" />
          </div>
        </Card>

        {/* Audit timeline logs */}
        <Card className="lg:col-span-1 p-5 flex flex-col gap-4 bg-surface border border-borderToken">
          <div className="flex justify-between items-center border-b border-borderToken pb-2">
            <div>
              <h3 className="font-bold text-xs font-display text-main">System Activity Audit Log</h3>
              <p className="text-[9px] text-muted">Real-time background timeline tracking executions</p>
            </div>
            <Activity className="w-4 h-4 text-pink-500" />
          </div>

          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
            {timeline.length === 0 ? (
              <span className="text-xs text-muted italic text-center py-10">No recent logs recorded.</span>
            ) : (
              timeline.map(item => (
                <div key={item.id} className="flex gap-3 text-xs leading-normal border-b border-borderToken/30 pb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <strong className="text-main font-bold truncate">{item.action}</strong>
                    <span className="text-muted truncate">{item.details}</span>
                    <span className="text-[8px] text-muted/75 mt-0.5 font-bold">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>

      {/* Model Performance List Grid */}
      <Card className="p-5 flex flex-col gap-4 bg-surface border border-borderToken">
        <span className="text-[10px] font-bold text-muted uppercase pb-2 border-b border-borderToken/50">Framework Accuracy Benchmarks</span>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-borderToken text-muted text-[10px] uppercase font-bold">
                <th className="py-2.5 font-semibold">Model Name</th>
                <th className="py-2.5 font-semibold">Total Requests</th>
                <th className="py-2.5 font-semibold">Success rate</th>
                <th className="py-2.5 font-semibold">Avg Latency</th>
                <th className="py-2.5 font-semibold">Compression %</th>
                <th className="py-2.5 font-semibold">ROUGE Accuracy</th>
                <th className="py-2.5 font-semibold">Rating</th>
              </tr>
            </thead>
            <tbody>
              {modelsList.map((m, idx) => (
                <tr key={idx} className="border-b border-borderToken/50 hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                  <td className="py-3 font-bold text-main">{m.modelName}</td>
                  <td className="py-3 text-muted font-bold">{m.requests}</td>
                  <td className="py-3 font-semibold text-emerald-500">{m.successRate}%</td>
                  <td className="py-3 text-main font-semibold">{m.avgResponseTime}s</td>
                  <td className="py-3 text-muted">{m.avgCompression}%</td>
                  <td className="py-3 text-primary font-bold">{m.avgRouge}%</td>
                  <td className="py-3 text-amber-500 font-bold">&#9733; {m.avgRating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
};

export default Performance;
