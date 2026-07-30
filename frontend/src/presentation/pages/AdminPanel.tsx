import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { 
  Settings, 
  Users, 
  FileText, 
  Activity, 
  Database, 
  ShieldAlert, 
  Cpu, 
  HardDrive, 
  Megaphone,
  RefreshCw,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/api";
import { useAuthStore } from "@/state";

const TABS = [
  { id: "dashboard", label: "Dashboard Overview", icon: <Activity className="w-4 h-4" /> },
  { id: "users", label: "User Management", icon: <Users className="w-4 h-4" /> },
  { id: "documents", label: "Documents", icon: <FileText className="w-4 h-4" /> },
  { id: "health", label: "System Health", icon: <Cpu className="w-4 h-4" /> },
];

export const AdminPanel: React.FC = () => {
  const { success, error: toastError } = useToast();
  const { profile } = useAuthStore();
  const isAdmin = profile?.is_admin || profile?.role === "admin" || profile?.role === "super_admin";
  
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  
  // Data States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isAdmin) {
      fetchData(activeTab);
    }
  }, [activeTab, isAdmin]);

  const fetchData = async (tab: string) => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      if (tab === "dashboard" || tab === "health") {
        const res = await apiClient.get("/admin/dashboard");
        setDashboardData(res.data);
      } else if (tab === "users") {
        const res = await apiClient.get("/admin/users");
        setUsers(res.data || []);
      } else if (tab === "documents") {
        const res = await apiClient.get("/admin/documents");
        setDocuments(res.data || []);
      }
    } catch (err: any) {
      console.error("Admin fetch error:", err);
      toastError(err?.response?.data?.detail || "Failed to load admin data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportUsers = () => {
    if (!users.length) return;
    const headers = ["id", "email", "name", "username", "role", "status", "created_at", "documents_count", "summaries_count"];
    const csv = [headers.join(","), ...users.map(u =>
      headers.map(h => `"${(u[h] ?? "").toString().replace(/"/g, '""')}"`).join(",")
    )].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_export.csv";
    a.click();
    URL.revokeObjectURL(url);
    success("Exported users_export.csv");
  };

  const renderDashboard = () => {
    if (!dashboardData) return <div className="text-center py-20 text-muted italic text-sm">No dashboard data available.</div>;
    
    // Backend returns: { metrics: {...}, system: {...} }
    const m = dashboardData.metrics || {};
    const sys = dashboardData.system || {};
    const recentActivity = dashboardData.recent_activity || [];

    const kpis = [
      { label: "Total Users", value: m.total_users ?? 0, icon: <Users className="w-5 h-5" />, color: "bg-primary/10 text-primary", badge: `+${m.new_users_today ?? 0} today` },
      { label: "Docs Processed", value: m.documents_processed ?? 0, icon: <FileText className="w-5 h-5" />, color: "bg-indigo-500/10 text-indigo-500", badge: `${m.documents_uploaded ?? 0} uploaded` },
      { label: "Summaries Generated", value: m.summaries_generated ?? 0, icon: <Activity className="w-5 h-5" />, color: "bg-amber-500/10 text-amber-500", badge: `${m.rouge_evaluations ?? 0} ROUGE evals` },
      { label: "API Requests", value: m.api_requests ?? 0, icon: <Database className="w-5 h-5" />, color: "bg-emerald-500/10 text-emerald-500", badge: "API calls" },
    ];

    return (
      <div className="flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {kpis.map(({ label, value, icon, color, badge }) => (
            <Card key={label} className="p-4 bg-surface border-borderToken">
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
                <span className="text-[10px] font-bold text-muted bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{badge}</span>
              </div>
              <h4 className="text-muted text-xs font-bold uppercase tracking-wider mb-1">{label}</h4>
              <div className="text-2xl font-bold text-main font-display">{value.toLocaleString()}</div>
            </Card>
          ))}
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-surface border-borderToken">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Storage Used</span>
            </div>
            <div className="text-xl font-bold text-main font-display">{m.storage_used ?? "0 KB"}</div>
          </Card>
          <Card className="p-4 bg-surface border-borderToken">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-muted uppercase tracking-wider">CPU / RAM</span>
            </div>
            <div className="text-xl font-bold text-main font-display">
              {sys.cpu ?? 0}% / {sys.ram ?? 0}%
            </div>
          </Card>
          <Card className="p-4 bg-surface border-borderToken">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-muted uppercase tracking-wider">System Status</span>
            </div>
            <div className={`text-xl font-bold font-display ${sys.status === "Healthy" ? "text-emerald-500" : "text-amber-500"}`}>
              {sys.status ?? "Unknown"}
            </div>
          </Card>
        </div>

        {/* Activity + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5 bg-surface border-borderToken">
            <h3 className="font-bold text-sm mb-4">Recent Activity</h3>
            <div className="flex flex-col gap-2.5">
              {recentActivity.length > 0 ? recentActivity.slice(0, 6).map((a: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-xs border-b border-borderToken/50 pb-2 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-main">{a.action}</span>
                    {a.details && <span className="text-muted ml-1.5 truncate block">{a.details}</span>}
                  </div>
                  <div className="text-muted shrink-0">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ""}</div>
                </div>
              )) : (
                <div className="text-muted text-xs italic py-4 text-center">No recent activity logged.</div>
              )}
            </div>
          </Card>
          
          <Card className="p-5 bg-surface border-borderToken">
            <h3 className="font-bold text-sm mb-4">System Alerts</h3>
            <div className="flex flex-col gap-2.5">
              {(sys.cpu ?? 0) > 80 && (
                <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-xs flex gap-2 items-center">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> High CPU: {sys.cpu}%
                </div>
              )}
              {(sys.ram ?? 0) > 85 && (
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg text-xs flex gap-2 items-center">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> High RAM: {sys.ram}%
                </div>
              )}
              {(m.failed_requests ?? 0) > 0 && (
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg text-xs flex gap-2 items-center">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {m.failed_requests} failed API requests
                </div>
              )}
              {((sys.cpu ?? 0) <= 80 && (sys.ram ?? 0) <= 85 && (m.failed_requests ?? 0) === 0) && (
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs flex gap-2 items-center">
                  <CheckCircle className="w-4 h-4 shrink-0" /> All systems nominal. No critical alerts.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderUsers = () => {
    const filtered = users.filter(u =>
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-input border border-borderToken rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleExportUsers}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-borderToken rounded-lg text-sm hover:bg-hover transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto bg-surface border border-borderToken rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-hover/50 text-muted border-b border-borderToken">
              <tr>
                <th className="p-3 font-semibold">User</th>
                <th className="p-3 font-semibold">Email</th>
                <th className="p-3 font-semibold">Role</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Docs</th>
                <th className="p-3 font-semibold">Summaries</th>
                <th className="p-3 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-borderToken hover:bg-hover/50 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {(u.avatar_data || u.avatar) ? (
                        <img 
                          src={u.avatar_data ? `data:${u.avatar_mime};base64,${u.avatar_data}` : u.avatar} 
                          alt="Avatar" 
                          className="w-8 h-8 rounded-full object-cover border border-borderToken shrink-0" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                          {u.name ? u.name[0] : (u.email ? u.email[0] : "U")}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-main">{u.name || u.email?.split("@")[0]}</div>
                        {u.username && <div className="text-[10px] text-muted">@{u.username}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted text-xs">{u.email}</td>
                  <td className="p-3">
                    <Badge
                      variant={u.role === "super_admin" ? "danger" : u.role === "admin" ? "primary" : "secondary"}
                      className="text-[10px]"
                    >
                      {u.role || "user"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${u.status === "active" ? "text-emerald-500" : "text-red-500"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                      {u.status || "unknown"}
                    </span>
                  </td>
                  <td className="p-3 text-muted text-xs">{u.documents_count ?? 0}</td>
                  <td className="p-3 text-muted text-xs">{u.summaries_count ?? 0}</td>
                  <td className="p-3 text-muted text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted italic text-sm">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-muted text-right">Showing {filtered.length} of {users.length} users</div>
      </div>
    );
  };

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this document? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/admin/documents/${id}`);
      success("Document deleted successfully.");
      fetchData("documents");
    } catch (err: any) {
      toastError(err?.response?.data?.detail || "Failed to delete document.");
    }
  };

  const renderDocuments = () => {
    const filtered = documents.filter(d =>
      (d.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.owner_email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="flex justify-between items-center gap-4 bg-surface border border-borderToken p-4 rounded-xl">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by file name or owner email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-app border border-borderToken rounded-lg pl-9 pr-4 py-2 text-xs text-main focus:outline-none focus:ring-1 focus:ring-primary w-full placeholder:text-muted"
            />
          </div>
          <span className="text-xs text-muted font-bold">Total: {filtered.length} document(s)</span>
        </div>

        {/* Table list */}
        <Card className="overflow-hidden border-borderToken">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-borderToken text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/40">
                <tr className="text-left font-bold text-muted uppercase tracking-wider">
                  <th className="px-5 py-3">Document ID</th>
                  <th className="px-5 py-3">Filename</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Uploaded By</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderToken bg-surface">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-muted italic">
                      No documents matched your query.
                    </td>
                  </tr>
                ) : (
                  filtered.map(doc => (
                    <tr key={doc.id} className="hover:bg-hover/20">
                      <td className="px-5 py-3.5 font-mono text-[10px] truncate max-w-[120px]">{doc.id}</td>
                      <td className="px-5 py-3.5 font-semibold text-main truncate max-w-[200px]" title={doc.name}>
                        {doc.name}
                      </td>
                      <td className="px-5 py-3.5 text-muted">{doc.size}</td>
                      <td className="px-5 py-3.5 text-muted uppercase font-semibold text-[9px]">{doc.type}</td>
                      <td className="px-5 py-3.5 text-main font-medium">{doc.owner_email}</td>
                      <td className="px-5 py-3.5 text-muted">
                        {doc.upload_time ? new Date(doc.upload_time).toLocaleDateString() : ""}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          doc.status === "ready" 
                            ? "bg-emerald-500/10 text-emerald-500" 
                            : "bg-amber-500/10 text-amber-500 animate-pulse"
                        }`}>
                          {doc.status || "processing"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="px-2.5 py-1.5 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg text-[10px] font-bold transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderHealth = () => {
    if (!dashboardData) return null;
    // Backend returns system: { cpu, ram, disk, status } and metrics: {...}
    const sys = dashboardData.system || {};
    const m = dashboardData.metrics || {};
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 bg-surface border-borderToken">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Service Status
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { name: "API Server (FastAPI)", status: "Operational", ok: true },
              { name: "Database", status: "Connected", ok: true },
              { name: "AI Inference (HuggingFace)", status: "Operational", ok: true },
              { name: "Cache (Redis)", status: "Not Configured", ok: false },
            ].map(({ name, status, ok }) => (
              <div key={name} className="flex justify-between items-center pb-2 border-b border-borderToken/50 last:border-0 last:pb-0">
                <span className="text-sm font-semibold">{name}</span>
                <Badge variant={ok ? "success" : "warning"}>{status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 bg-surface border-borderToken">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-500" /> Resource Utilization
          </h3>
          <div className="flex flex-col gap-4">
            {[
              { label: "CPU Usage", value: sys.cpu ?? 0 },
              { label: "RAM Usage", value: sys.ram ?? 0 },
              { label: "Disk Usage", value: sys.disk ?? 0 },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1 font-semibold">
                  <span>{label}</span>
                  <span className={value > 80 ? "text-red-500" : value > 60 ? "text-amber-500" : "text-emerald-500"}>{value}%</span>
                </div>
                <ProgressBar progress={value} className="h-2" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 bg-surface border-borderToken md:col-span-2">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-500" /> Usage Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "API Requests", value: m.api_requests ?? 0 },
              { label: "Failed Requests", value: m.failed_requests ?? 0 },
              { label: "Active Users", value: m.active_users ?? 0 },
              { label: "Storage Used", value: m.storage_used ?? "0 KB" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1 p-3 bg-app border border-borderToken rounded-lg">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</span>
                <span className="text-lg font-bold text-main font-display">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted text-xs">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Checking permissions…
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Sidebar Tabs */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        <div className="bg-surface border border-borderToken p-4 rounded-xl md:sticky md:top-4">
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2 text-main">
            <Settings className="w-5 h-5 text-primary" /> Admin Center
          </h2>
          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery("");
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "text-muted hover:bg-hover hover:text-main"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-main">
            {TABS.find(t => t.id === activeTab)?.label}
          </h1>
          <button 
            onClick={() => fetchData(activeTab)} 
            disabled={isLoading}
            className="p-2 rounded-lg bg-surface border border-borderToken hover:bg-hover text-muted hover:text-primary transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "users" && renderUsers()}
            {activeTab === "documents" && renderDocuments()}
            {activeTab === "health" && renderHealth()}
          </>
        )}
      </div>
    </div>
  );
};
export default AdminPanel;
