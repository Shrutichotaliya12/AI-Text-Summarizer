import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home as HomeIcon, 
  BarChart2, 
  CheckSquare, 
  Activity, 
  Info, 
  Sun, 
  Moon, 
  Cpu,
  Settings,
  User,
  Search,
  Menu,
  MessageSquare,
  X,
  Pin,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  Bell,
  Trash2,
  AlertTriangle,
  FolderOpen,
  Database,
  Github,
  Linkedin,
  Globe
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { Slider } from "@/components/ui/Slider";
import { Dropdown } from "@/components/ui/Dropdown";
import { useModelStore, useAuthStore, useDocumentStore } from "@/state";
import { useTranslation } from "@/context/TranslationContext";
import { apiClient } from "@/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const RealTimeFooter: React.FC = () => {
  const [statuses, setStatuses] = useState({
    ai: { state: "checking", lastChecked: "" },
    db: { state: "checking", lastChecked: "" },
    auth: { state: "checking", lastChecked: "" },
    email: { state: "checking", lastChecked: "" },
    storage: { state: "checking", lastChecked: "" },
    api: { state: "checking", lastChecked: "" }
  });

  useEffect(() => {
    const fetchHealth = async () => {
      const endpoints = [
        { key: "ai", url: "/ai/health" },
        { key: "db", url: "/db/health" },
        { key: "auth", url: "/auth/health" },
        { key: "email", url: "/email/health" },
        { key: "storage", url: "/storage/health" },
        { key: "api", url: "/health" }
      ];
      
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      endpoints.forEach(async ({ key, url }) => {
        try {
          const res = await apiClient.get(url, { timeout: 3000 });
          setStatuses(prev => ({
            ...prev,
            [key]: { state: res.status === 200 ? "working" : "error", lastChecked: now }
          }));
        } catch {
          setStatuses(prev => ({
            ...prev,
            [key]: { state: "offline", lastChecked: now }
          }));
        }
      });
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    { label: "AI Service", key: "ai" },
    { label: "Database", key: "db" },
    { label: "Authentication", key: "auth" },
    { label: "Email Service", key: "email" },
    { label: "Storage", key: "storage" },
    { label: "API Server", key: "api" }
  ];

  return (
    <footer className="mt-12 bg-white dark:bg-[#0F172A] border-t border-slate-200 dark:border-[#1E293B] rounded-t-3xl shadow-[0_-4px_25px_-5px_rgba(0,0,0,0.1)] pt-6 pb-6 px-4 w-full transition-colors duration-500 select-none font-sans text-center relative z-10 text-slate-800 dark:text-white backdrop-blur-sm dark:bg-opacity-90">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-4">
        
        {/* TOP ROW: Status */}
        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 text-[13.5px]">
          {services.map((svc, idx) => {
            const s = statuses[svc.key as keyof typeof statuses];
            let dotColor = "bg-amber-400";
            let textColor = "text-amber-500 dark:text-amber-400";
            let text = "Checking...";
            
            if (s.state === "working") {
              dotColor = "bg-emerald-500";
              textColor = "text-emerald-500 dark:text-emerald-400";
              text = "Working";
            } else if (s.state === "offline" || s.state === "error") {
              dotColor = "bg-red-500";
              textColor = "text-red-500 dark:text-red-400";
              text = "Offline";
            }

            return (
              <div key={idx} className="flex flex-col items-center gap-1 transition-transform hover:scale-105 cursor-default group relative">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{svc.label}:</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${dotColor} ${s.state === "working" ? "animate-pulse" : ""}`}></span>
                  <span className={`${textColor} font-semibold`}>{text}</span>
                </div>
                {s.lastChecked && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 whitespace-nowrap">
                    Checked: {s.lastChecked}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* MIDDLE ROW: Copyright & Tech Stack */}
        <div className="text-[13.5px] text-slate-500 dark:text-slate-400 font-medium mt-4">
          &copy; 2026 AI Text Summarizer Pro &bull; Version 1.0.0
        </div>

        {/* BOTTOM ROW: Author */}
        <div className="text-[13.5px] text-slate-500 dark:text-slate-400 font-medium">
          Designed & Developed by <a href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold hover:underline transition-all">Shruti Chotaliya</a>
        </div>
      </div>
    </footer>
  );
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t, locale } = useTranslation();
  const { logout, user, profile, notifications, unreadCount, fetchProfile, fetchNotifications } = useAuthStore();
  
  // Connect model states from Zustand store
  const { selectedModelId, setSelectedModelId, models } = useModelStore();

  // Layout States
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [minLength, setMinLength] = useState(30);
  const [maxLength, setMaxLength] = useState(150);

  // Global Search Results State
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Recent files from DB
  const [recentFiles, setRecentFiles] = useState<any[]>([]);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [hideBanner, setHideBanner] = useState(() => localStorage.getItem("hideProfileBanner") === "true");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // API Status States
  const [apiStatus, setApiStatus] = useState<any>({
    ai: "Working",
    db: "Working",
    auth: "Working",
    email: "Working",
    storage: "Working"
  });

  // Pinned page list
  const [pinnedPaths, setPinnedPaths] = useState<string[]>(["/", "/document-analysis"]);

  // Fetch recent files from DB
  const fetchRecentFiles = async () => {
    try {
      const response = await apiClient.get("/upload/");
      // Grab top 3 recent uploaded files
      const list = response.data.documents || [];
      setRecentFiles(list.slice(0, 3));
    } catch (error) {
      console.error("Failed to load recent files:", error);
    }
  };

  // Fetch documents count
  const { totalDocuments, fetchDocuments } = useDocumentStore();

  useEffect(() => {
    fetchRecentFiles();
    fetchProfile();
    fetchNotifications();
    fetchDocuments();
  }, [location.pathname, fetchProfile, fetchNotifications, fetchDocuments]); // Reload when page changes/upload completes

  const checkHealth = async () => {
    try {
      const response = await apiClient.get("/system/status");
      if (response.data) {
        setApiStatus({
          ai: response.data.ai,
          db: response.data.database,
          auth: response.data.authentication,
          email: response.data.email,
          storage: response.data.storage
        });
      }
    } catch (error) {
      setApiStatus({
        ai: "offline",
        db: "offline",
        auth: "offline",
        email: "offline",
        storage: "offline"
      });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Global Search trigger
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults(null);
        setShowSearchDropdown(false);
        return;
      }
      try {
        const response = await apiClient.get(`/analytics/search?query=${searchQuery}`);
        setSearchResults(response.data);
        setShowSearchDropdown(true);
      } catch (error) {
        console.error("Global search query failed:", error);
      }
    };

    const delayDebounce = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Click outside and Escape to close notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showNotifications]);

  // Load preferences from Settings
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await apiClient.get("/auth/settings");
        const s = response.data;
        if (s.theme === "dark") {
          setTheme("dark");
          document.body.classList.add("dark");
        } else {
          setTheme("light");
          document.body.classList.remove("dark");
        }
      } catch (e) {
        // Fallback local storage
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") {
          setTheme("dark");
          document.body.classList.add("dark");
        }
      }
    };
    loadPreferences();
  }, []);

  // Navigation Items
  const baseNavItems = [
    { label: t("nav_home"), path: "/", icon: <HomeIcon className="w-4 h-4" />, badge: null },
    { label: t("nav_tools"), path: "/ai-tools", icon: <Sparkles className="w-4 h-4" />, badge: models.length > 0 ? models.length.toString() : null },
    { label: "Model Catalog", path: "/models", icon: <Database className="w-4 h-4" />, badge: null },
    { label: t("nav_upload"), path: "/upload", icon: <FolderOpen className="w-4 h-4" />, badge: profile?.stats?.documents_count > 0 ? profile.stats.documents_count.toString() : null },

    { label: t("nav_history"), path: "/history", icon: <FileText className="w-4 h-4" />, badge: profile?.stats?.summaries_count > 0 ? profile.stats.summaries_count.toString() : null },
    { label: "Document Analysis", path: "/document-analysis", icon: <BarChart2 className="w-4 h-4" />, badge: null },
    { label: t("nav_rouge"), path: "/rouge-evaluation", icon: <CheckSquare className="w-4 h-4" />, badge: profile?.stats?.rouge_count > 0 ? profile.stats.rouge_count.toString() : null },
    { label: t("nav_performance"), path: "/performance", icon: <Activity className="w-4 h-4" />, badge: null },
    { label: "Recycle Bin", path: "/trash", icon: <Trash2 className="w-4 h-4" />, badge: profile?.stats?.trash_count > 0 ? profile.stats.trash_count.toString() : null },
    { label: "Profile", path: "/profile", icon: <User className="w-4 h-4" />, badge: null },
    { label: t("nav_about"), path: "/about", icon: <Info className="w-4 h-4" />, badge: null },
    { label: "Notification Center", path: "/notifications", icon: <Bell className="w-4 h-4" />, badge: unreadCount > 0 ? unreadCount.toString() : null }
  ];

  const isAdmin = profile?.is_admin || profile?.role === "admin" || profile?.role === "super_admin" || user?.is_admin || user?.role === "admin" || user?.role === "super_admin";
  
  const navItems = isAdmin 
    ? [...baseNavItems, { label: "Admin Panel", path: "/admin", icon: <Shield className="w-4 h-4" />, badge: null }]
    : baseNavItems;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifier && e.key === "\\") {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }
      
      if (modifier && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleTheme = async () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    const bodyClass = document.body.classList;
    if (nextTheme === "dark") {
      bodyClass.add("dark");
    } else {
      bodyClass.remove("dark");
    }
    localStorage.setItem("theme", nextTheme);
    try {
      await apiClient.post("/auth/settings", { theme: nextTheme });
    } catch (e) {
      console.error(e);
    }
  };

  const getPageTitle = () => {
    const matched = navItems.find(item => item.path === location.pathname);
    return matched ? matched.label : "Home";
  };

  const filteredNavItems = navItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePin = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pinnedPaths.includes(path)) {
      setPinnedPaths(pinnedPaths.filter(p => p !== path));
    } else {
      setPinnedPaths([...pinnedPaths, path]);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post("/notifications/mark-all-read");
      fetchNotifications();
    } catch (e) {
      console.error("Failed to mark notifications read:", e);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await apiClient.delete("/notifications/");
      fetchNotifications();
    } catch (e) {
      console.error("Failed to clear notifications:", e);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between select-none">
      <div className="flex flex-col gap-5">
        
        {/* Brand header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-2 rounded-xl shadow-md">
              <Cpu className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="font-bold text-sm tracking-tight leading-none font-display">{t("brand_name")}</h2>
                <span className="text-[9px] text-muted font-bold capitalize">{isAdmin ? "Admin Edition" : profile?.role || "Standard Edition"}</span>
              </motion.div>
            )}
          </div>
          
          {!isMobileOpen && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1 rounded-md hover:bg-hover text-muted hover:text-main transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Search Input and Dropdown */}
        {!isCollapsed ? (
          <div className="relative mx-1">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t("sidebar_search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-app border border-borderToken rounded-md pl-8 pr-7 py-1.5 text-xs text-main placeholder-muted/70 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-8 top-2.5 text-muted hover:text-main"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <span className="absolute right-2 top-2.5 text-[9px] font-bold text-muted bg-surface px-1 border border-borderToken rounded select-none pointer-events-none">
              Ctrl+K
            </span>

            {/* Global Search Matches Overlay */}
            {showSearchDropdown && searchResults && (
              <div className="absolute left-0 right-0 mt-1 bg-surface border border-borderToken rounded-lg shadow-premium z-50 text-[10px] flex flex-col p-2 max-h-60 overflow-y-auto">
                <div className="flex justify-between items-center border-b border-borderToken pb-1 mb-1">
                  <span className="font-bold text-main">Search Results</span>
                  <button onClick={() => setShowSearchDropdown(false)}><X className="w-3 h-3" /></button>
                </div>
                
                {searchResults.documents.length === 0 && searchResults.summaries.length === 0 && (
                  <span className="text-muted italic py-1">No matching results found.</span>
                )}

                {searchResults.documents.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="font-bold text-primary">Documents</span>
                    {searchResults.documents.map((d: any) => (
                      <Link 
                        key={d.id} 
                        to="/upload" 
                        onClick={() => setShowSearchDropdown(false)}
                        className="py-1 px-1.5 rounded hover:bg-hover truncate text-main"
                      >
                        📄 {d.name}
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.summaries.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="font-bold text-indigo-500">Summaries</span>
                    {searchResults.summaries.map((s: any) => (
                      <Link 
                        key={s.id} 
                        to="/history" 
                        onClick={() => setShowSearchDropdown(false)}
                        className="py-1 px-1.5 rounded hover:bg-hover truncate text-main"
                      >
                        ⚡ {s.title}
                      </Link>
                    ))}
                  </div>
                )}


              </div>
            )}
          </div>
        ) : (
          <Tooltip content="Press Ctrl+K to Search" position="right">
            <button 
              onClick={() => setIsCollapsed(false)}
              className="w-full flex items-center justify-center p-2 rounded-md hover:bg-hover text-muted hover:text-main transition-all"
            >
              <Search className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        {/* Pinned Pages */}
        {!isCollapsed && pinnedPaths.length > 0 && (
          <div className="flex flex-col gap-1 px-1">
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider px-2 flex items-center gap-1.5">
              <Pin className="w-2.5 h-2.5 rotate-45" /> {t("sidebar_pinned")}
            </span>
            {navItems
              .filter(item => pinnedPaths.includes(item.path))
              .map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold hover:bg-hover transition-colors ${
                    location.pathname === item.path ? "text-primary bg-primary/5" : "text-main"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </span>
                  <button onClick={(e) => togglePin(item.path, e)} className="text-primary hover:text-danger p-0.5">
                    <Pin className="w-3 h-3 rotate-45 fill-current" />
                  </button>
                </Link>
              ))}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5">
          {!isCollapsed && (
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1.5 px-3">Navigation</span>
          )}
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isPinned = pinnedPaths.includes(item.path);
            
            const linkContent = (
              <Link
                to={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                  isActive 
                    ? "bg-primary text-white shadow-glow" 
                    : "text-muted hover:bg-hover hover:text-main"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                
                {!isCollapsed && (
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold leading-none ${
                        isActive ? "bg-white/20 text-white" : "bg-danger/10 text-danger"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    <button 
                      onClick={(e) => togglePin(item.path, e)} 
                      className={`opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity ${
                        isActive ? "text-white/60 hover:text-white" : "text-muted"
                      }`}
                    >
                      <Pin className={`w-3 h-3 rotate-45 ${isPinned ? "fill-current text-primary" : ""}`} />
                    </button>
                  </div>
                )}
              </Link>
            );

            return isCollapsed ? (
              <Tooltip key={item.path} content={item.label} position="right">
                <div className="group relative">{linkContent}</div>
              </Tooltip>
            ) : (
              <div key={item.path} className="group relative">{linkContent}</div>
            );
          })}
        </nav>

        {/* Recent Files Loading from DB */}
        {!isCollapsed && recentFiles.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-borderToken/60 pt-4 px-1">
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider px-2 flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Recent Files
            </span>
            {recentFiles.map(file => (
              <div 
                key={file.id} 
                onClick={() => navigate("/upload")}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] text-main hover:bg-hover cursor-pointer group"
              >
                <span className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-muted shrink-0" />
                  <span className="truncate">{file.name}</span>
                </span>
                <button className="hidden group-hover:block text-primary hover:text-primary-hover font-bold text-[8px]">View</button>
              </div>
            ))}
          </div>
        )}

        {/* Model Settings Selector */}
        {!isCollapsed && (
          <div className="flex flex-col gap-4 border-t border-borderToken/60 pt-4 px-1">
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider px-2">{t("sidebar_model_selector")}</span>
            
            <Dropdown
              label="Transformer Model"
              options={models
                .filter(m => m.downloadStatus === "downloaded" && m.availability === "active")
                .map(m => ({ value: m.id, label: m.name }))}
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
            />

            <Slider
              label={t("sidebar_min_length")}
              min={10}
              max={200}
              value={minLength}
              onChangeValue={setMinLength}
            />

            <Slider
              label={t("sidebar_max_length")}
              min={50}
              max={500}
              value={maxLength}
              onChangeValue={setMaxLength}
            />
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="flex flex-col gap-4 border-t border-borderToken pt-4">
        {!isCollapsed && (
          <div className="flex justify-center text-[9px] text-muted/60 font-bold">
            <span>Version 1.0 &bull; Press Ctrl+\</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app text-main font-sans transition-colors duration-300">
      
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 260 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col justify-between p-5 border-r border-borderToken bg-surface shrink-0 h-full overflow-y-auto glass-surface transition-colors duration-300"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="relative w-[260px] bg-surface h-full p-5 border-r border-borderToken flex flex-col justify-between z-10"
            >
              <SidebarContent />
              <button
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-5 right-5 p-1 rounded-md hover:bg-hover text-muted hover:text-main"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Right Side Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <header className="h-16 border-b border-borderToken bg-surface flex items-center justify-between px-8 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-muted hover:text-main hover:bg-hover transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold tracking-tight font-display">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-4 relative">
            
            {/* Bell Notifications Bell Center dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-hover transition-all relative"
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-danger rounded-full ring-2 ring-surface animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 bg-surface border border-borderToken rounded-lg shadow-premium w-64 z-50 text-[10px] p-3 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center border-b border-borderToken pb-1.5">
                    <span className="font-bold text-main">Notifications</span>
                    <button onClick={() => setShowNotifications(false)} className="text-muted hover:text-main transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <span className="text-muted italic text-center py-4">No notifications</span>
                    ) : (
                      notifications
                        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
                        .slice(0, 5)
                        .map(n => (
                        <div key={n.id} className={`p-2.5 rounded-lg border border-borderToken/40 flex gap-2.5 transition-all hover:bg-hover/30 relative ${n.is_read ? "opacity-75" : "bg-primary/5 font-semibold text-main border-primary/10"}`}>
                          
                          {/* Avatar */}
                          {(profile?.avatar_data || profile?.avatar) ? (
                            <img src={profile?.avatar_data ? `data:${profile.avatar_mime};base64,${profile.avatar_data}` : profile?.avatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover border border-borderToken shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-[9px] shrink-0 uppercase mt-0.5">
                              {profile?.name ? profile.name[0] : (user?.email ? user.email[0] : "U")}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {/* Title & Status */}
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-bold text-[10px] text-main truncate">{n.title || "Notification"}</span>
                              {!n.is_read && <span className="h-1.5 w-1.5 bg-primary rounded-full shrink-0 mt-1" />}
                            </div>
                            {/* Short Description */}
                            <p className="text-[9px] text-muted leading-tight mt-0.5 line-clamp-2">{n.text}</p>
                            {/* Time */}
                            <span className="text-[8px] text-muted block mt-1">
                              {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : n.time}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-borderToken pt-1.5 flex justify-center">
                    <Link 
                      to="/notifications" 
                      onClick={() => setShowNotifications(false)} 
                      className="text-primary font-bold text-center hover:underline flex items-center gap-1"
                    >
                      View All →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-hover transition-all"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <Link to="/settings" className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-hover transition-all">
              <Settings className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 select-none border-l border-borderToken/60 pl-3">
              <Link to="/profile" className="hidden lg:flex items-center gap-2 text-xs text-muted font-bold truncate hover:text-primary transition-colors">
                {(profile?.avatar_data || profile?.avatar) ? (
                  <img src={profile?.avatar_data ? `data:${profile.avatar_mime};base64,${profile.avatar_data}` : profile?.avatar} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-borderToken shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                    {profile?.name ? profile.name[0] : (user?.email ? user.email[0] : "U")}
                  </div>
                )}
                <span className="truncate max-w-[100px]">{profile?.display_name || profile?.name || user?.email?.split("@")[0]}</span>
              </Link>
              <button 
                onClick={logout}
                title={t("btn_logout")}
                className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-between relative">
          
          <AnimatePresence>
            {profile && (() => {
              const req = ["first_name", "last_name", "display_name", "username", "country", "state", "city", "language"];
              
              let filled = 0;
              req.forEach(k => { if (!!(profile as any)[k]) filled++; });
              
              // Email is implicitly present if profile exists
              filled++; 
              
              // Avatar check
              if (profile.avatar_data || profile.avatar) filled++;
              
              const total = req.length + 2; // +1 email, +1 avatar
              const percent = Math.round((filled / total) * 100);
              const isComplete = percent === 100;
              
              if (isComplete || hideBanner || location.pathname === "/profile") return null;
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20, height: 0, margin: 0 }}
                  className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 p-3 mb-6 rounded-lg flex items-center justify-between shadow-sm shrink-0"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <div className="flex flex-col text-xs">
                      <span className="font-bold">Your profile is {percent}% complete.</span>
                      <span>Complete your profile to unlock all features.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to="/profile" className="text-xs font-bold bg-amber-500/20 px-3 py-1.5 rounded-md hover:bg-amber-500/30 transition-colors">
                      Complete Profile
                    </Link>
                    <button 
                      onClick={() => {
                        setHideBanner(true);
                        localStorage.setItem("hideProfileBanner", "true");
                      }} 
                      className="text-amber-600/70 hover:text-amber-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col gap-6">
            {children}
          </div>
          
          <RealTimeFooter />
        </div>

      </div>
    </div>
  );
};
export default DashboardLayout;
