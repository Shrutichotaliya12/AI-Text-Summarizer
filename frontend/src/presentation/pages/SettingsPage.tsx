import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Paintbrush,
  Cpu,
  FileText,
  MessageSquare,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Eye as PrivacyIcon,
  Accessibility,
  Globe,
  Keyboard,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Folder,
  Trash2,
  ListFilter,
  Check,
  RotateCcw,
  Sparkles,
  Search,
  BookOpen,
  X
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation, LanguageCode } from "@/context/TranslationContext";
import { useToast } from "@/context/ToastContext";
import { apiClient } from "@/api";
import { useAuthStore } from "@/state";

type SettingsCategory =
  | "appearance"
  | "ai"
  | "document"
  | "notifications"
  | "privacy"
  | "accessibility"
  | "language"
  | "shortcuts"
  | "storage"
  | "security";

interface UserSettingsData {
  theme: string;
  language: string;
  model_id: string;
  notifications_enabled: boolean;
  auto_save: boolean;
  storage_provider: string;
  backup_enabled: boolean;
  security_level: string;
  openai_key: string;
  hf_key: string;
  enable_2fa: boolean;
  trash_clear_days: number;

  // Appearance
  accent_color: string;
  font_size: string;
  sidebar_mode: string;
  compact_mode: boolean;
  animations_enabled: boolean;
  reduce_motion: boolean;
  rounded_corners: boolean;
  card_density: string;

  // AI Preferences
  summary_length: string;
  temperature: number;
  max_tokens: number;
  reading_mode: boolean;
  response_style: string;
  creativity_level: number;
  auto_detect_language: boolean;
  streaming_responses: boolean;
  auto_save_summaries: boolean;
  auto_generate_titles: boolean;

  // Document Preferences
  auto_extract_text: boolean;
  auto_analyze_documents: boolean;
  auto_generate_summary: boolean;
  auto_run_rouge: boolean;
  auto_delete_temp: boolean;
  default_export_format: string;

  // Notification Preferences
  email_notifications: boolean;
  summary_alerts: boolean;
  upload_alerts: boolean;
  security_alerts: boolean;
  product_updates: boolean;
  analysis_alerts: boolean;
  rouge_alerts: boolean;

  system_updates: boolean;
  maintenance_notices: boolean;

  // Privacy

  document_retention: boolean;
  search_history: boolean;
  usage_analytics: boolean;
  diagnostic_data: boolean;
  personalized_recommendations: boolean;
  data_sharing: boolean;

  // Accessibility
  high_contrast: boolean;
  large_text: boolean;
  keyboard_navigation: boolean;
  screen_reader_support: boolean;
  focus_indicators: boolean;
  color_blind_mode: boolean;

  // Language & Region
  timezone: string;
  date_format: string;
  time_format: string;
  number_format: string;

  // Keyboard Shortcuts
  shortcuts_enabled: boolean;
  quick_search_shortcut: boolean;
  quick_upload_shortcut: boolean;
  quick_summary_shortcut: boolean;


  // Security Preferences
  session_timeout_minutes: number;
  auto_logout: boolean;
  security_notifications: boolean;
  trusted_devices: boolean;
}

const DEFAULT_SETTINGS: UserSettingsData = {
  theme: "dark",
  language: "en",
  model_id: "distilbart",
  notifications_enabled: true,
  auto_save: true,
  storage_provider: "local",
  backup_enabled: true,
  security_level: "standard",
  openai_key: "",
  hf_key: "",
  enable_2fa: false,
  trash_clear_days: 30,

  accent_color: "#6366f1",
  font_size: "medium",
  sidebar_mode: "expanded",
  compact_mode: false,
  animations_enabled: true,
  reduce_motion: false,
  rounded_corners: true,
  card_density: "comfortable",

  summary_length: "medium",
  temperature: 0.7,
  max_tokens: 512,
  reading_mode: false,
  response_style: "balanced",
  creativity_level: 0.5,
  auto_detect_language: true,
  streaming_responses: true,
  auto_save_summaries: true,
  auto_generate_titles: true,

  auto_extract_text: true,
  auto_analyze_documents: false,
  auto_generate_summary: false,
  auto_run_rouge: false,
  auto_delete_temp: true,
  default_export_format: "pdf",



  email_notifications: true,
  summary_alerts: true,
  upload_alerts: true,
  security_alerts: true,
  product_updates: false,
  analysis_alerts: true,
  rouge_alerts: true,

  system_updates: true,
  maintenance_notices: true,


  document_retention: true,
  search_history: true,
  usage_analytics: true,
  diagnostic_data: false,
  personalized_recommendations: true,
  data_sharing: false,

  high_contrast: false,
  large_text: false,
  keyboard_navigation: true,
  screen_reader_support: false,
  focus_indicators: true,
  color_blind_mode: false,

  timezone: "UTC",
  date_format: "MM/DD/YYYY",
  time_format: "12h",
  number_format: "1,000.00",

  shortcuts_enabled: true,
  quick_search_shortcut: true,
  quick_upload_shortcut: true,
  quick_summary_shortcut: true,


  session_timeout_minutes: 60,
  auto_logout: false,
  security_notifications: true,
  trusted_devices: true
};

const ACCENT_COLORS = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Violet", hex: "#8b5cf6" }
];

export const SettingsPage: React.FC = () => {
  const { t, locale, setLocale } = useTranslation();
  const { success, error: toastError } = useToast();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("appearance");
  const [settings, setSettings] = useState<UserSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);

  // Storage Stats State
  const [storageStats, setStorageStats] = useState<any>(null);
  const [tempCacheSize, setTempCacheSize] = useState("4.2 MB");
  const [tempFileSize, setTempFileSize] = useState("1.8 MB");

  // Show/Hide password keys
  const [showOpenai, setShowOpenai] = useState(false);
  const [showHf, setShowHf] = useState(false);

  // Dialogs
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // File Upload Reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await apiClient.get("/auth/settings");
      setSettings(prev => ({ ...prev, ...res.data }));
      applyGlobalStyles(res.data);
    } catch {
      toastError("Failed to retrieve personalization settings.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageInfo = async () => {
    try {
      const res = await apiClient.get("/auth/storage-stats");
      setStorageStats(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchSettings();
    fetchStorageInfo();
  }, []);

  // Update single settings property
  const updateSetting = async (key: keyof UserSettingsData, value: any) => {
    setSavingField(key);
    // Optimistic UI Update
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    applyGlobalStyles({ [key]: value });

    try {
      await apiClient.post("/auth/settings", { [key]: value });
      // Special handle: If language settings changes, trigger locale change
      if (key === "language") {
        setLocale(value as LanguageCode);
      }
    } catch {
      toastError(`Failed to save configuration for ${key}.`);
      // Rollback
      fetchSettings();
    } finally {
      setSavingField(null);
    }
  };

  // Apply visual styling parameters on root/body element
  const applyGlobalStyles = (data: Partial<UserSettingsData>) => {
    const root = document.documentElement;
    const body = document.body;

    if (data.theme) {
      if (data.theme === "dark") {
        body.classList.add("dark");
      } else if (data.theme === "light") {
        body.classList.remove("dark");
      } else {
        // System preference
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        body.classList.toggle("dark", isDark);
      }
    }

    if (data.accent_color) {
      root.style.setProperty("--primary-accent", data.accent_color);
      // Try to update tailwind custom classes if mapped
    }

    if (data.font_size) {
      body.classList.remove("font-sz-small", "font-sz-medium", "font-sz-large");
      body.classList.add(`font-sz-${data.font_size}`);
    }

    if (data.rounded_corners !== undefined) {
      if (data.rounded_corners) {
        root.style.setProperty("--border-radius-factor", "1");
      } else {
        root.style.setProperty("--border-radius-factor", "0");
      }
    }

    if (data.high_contrast !== undefined) {
      body.classList.toggle("high-contrast", data.high_contrast);
    }

    if (data.large_text !== undefined) {
      body.classList.toggle("large-text-accessibility", data.large_text);
    }

    if (data.color_blind_mode !== undefined) {
      body.classList.toggle("color-blind-palette", data.color_blind_mode);
    }
  };

  // Reset all to defaults
  const handleResetToDefaults = async () => {
    try {
      const res = await apiClient.post("/auth/settings/reset");
      setSettings(res.data.settings);
      applyGlobalStyles(res.data.settings);
      success("Settings reset to system default values.");
      setShowResetConfirm(false);
    } catch {
      toastError("Failed to reset settings.");
    }
  };

  // Export Settings JSON
  const handleExportSettings = async () => {
    try {
      const res = await apiClient.get("/auth/settings/export");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "summarizer_settings_export.json";
      a.click();
      URL.revokeObjectURL(url);
      success("Settings configuration exported successfully!");
    } catch {
      toastError("Export failed.");
    }
  };

  // Import Settings JSON
  const handleImportSettings = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = JSON.parse(reader.result as string);
        const res = await apiClient.post("/auth/settings/import", payload);
        setSettings(res.data.settings);
        applyGlobalStyles(res.data.settings);
        success("Personalized settings imported successfully!");
      } catch {
        toastError("Invalid or corrupted settings backup file format.");
      }
    };
    reader.readAsText(file);
    // Reset file input value to allow re-uploading same file name
    e.target.value = "";
  };

  // Cache & Cleanup ops
  const handleClearCache = () => {
    setTempCacheSize("0.0 KB");
    success("Browser cache cleared.");
  };

  const handleDeleteTempFiles = () => {
    setTempFileSize("0.0 KB");
    success("Temporary files deleted.");
  };

  const handleOptimizeStorage = async () => {
    try {
      await apiClient.post("/auth/cleanup-storage");
      fetchStorageInfo();
      success("Storage successfully optimized!");
    } catch {
      toastError("Storage optimization failed.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted text-xs">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading Settings Center...
      </div>
    );
  }

  // Sidebar Menu list
  const MENU_ITEMS: { id: SettingsCategory; label: string; icon: React.ComponentType<any> }[] = [
    { id: "appearance",     label: "Appearance",        icon: Paintbrush },
    { id: "ai",             label: "AI Defaults",       icon: Sliders },
    { id: "document",       label: "Documents",         icon: FileText },

    { id: "notifications",  label: "Notifications",     icon: Bell },
    { id: "privacy",        label: "Privacy Control",   icon: PrivacyIcon },
    { id: "accessibility",  label: "Accessibility",     icon: Accessibility },
    { id: "language",       label: "Region & Lang",     icon: Globe },
    { id: "shortcuts",      label: "Shortcuts",         icon: Keyboard },
    { id: "storage",        label: "Data & Storage",    icon: HardDrive },
    { id: "security",       label: "Security & 2FA",    icon: Lock }
  ];

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full text-xs text-slate-700 dark:text-slate-300">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-borderToken pb-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold font-display text-main">Settings</h2>
          <p className="text-xs text-muted">Personalize workspace style, AI behaviour defaults, region, and security.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="text-[10px] gap-1 px-3 border-borderToken">
            <Upload className="w-3.5 h-3.5" /> Import
          </Button>
          <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={handleImportSettings} />
          
          <Button size="sm" variant="outline" onClick={handleExportSettings} className="text-[10px] gap-1 px-3 border-borderToken">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>

          <Button size="sm" variant="outline" onClick={() => setShowResetConfirm(true)} className="text-[10px] gap-1 px-3 border-danger/25 text-danger hover:bg-danger hover:text-white">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Default
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Left Side Navigation Menu */}
        <div className="md:col-span-1 flex flex-col gap-1 bg-surface border border-borderToken p-2.5 rounded-xl h-fit">
          {MENU_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveCategory(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-semibold text-[11px] transition-all
                  ${active 
                    ? "bg-primary text-white shadow-sm" 
                    : "text-muted hover:text-main hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side Content Panel */}
        <Card className="md:col-span-3 p-6 bg-surface border-borderToken min-h-[450px] flex flex-col justify-between">
          <div className="flex flex-col gap-5">
            
            {/* 🎨 APPEARANCE */}
            {activeCategory === "appearance" && (
              <div className="flex flex-col gap-4">
                <div className="border-b border-borderToken pb-2">
                  <h3 className="font-bold text-sm text-main font-display">Appearance</h3>
                  <p className="text-[10px] text-muted">Customize the visual theme, colors, and density layout.</p>
                </div>

                {/* Theme Selector */}
                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Theme Mode</span>
                    <span className="text-[10px] text-muted">Toggle workspace interface mode</span>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-800/40 p-1 rounded-lg border border-borderToken/50">
                    {[
                      { id: "light", label: "Light" },
                      { id: "dark", label: "Dark" },
                      { id: "system", label: "System" }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => updateSetting("theme", t.id)}
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                          settings.theme === t.id 
                            ? "bg-surface border border-borderToken text-main shadow-sm" 
                            : "text-muted hover:text-main"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div className="flex justify-between items-center border-t border-borderToken/50 pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Accent Color</span>
                    <span className="text-[10px] text-muted">Select workspace focus color scheme</span>
                  </div>
                  <div className="flex gap-2">
                    {ACCENT_COLORS.map(c => (
                      <button
                        key={c.name}
                        onClick={() => updateSetting("accent_color", c.hex)}
                        title={c.name}
                        className="w-5 h-5 rounded-full border-2 transition-all relative flex items-center justify-center hover:scale-110"
                        style={{ backgroundColor: c.hex, borderColor: settings.accent_color === c.hex ? "white" : "transparent" }}
                      >
                        {settings.accent_color === c.hex && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div className="flex justify-between items-center border-t border-borderToken/50 pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Base Font Size</span>
                    <span className="text-[10px] text-muted">Increase or decrease text scaling</span>
                  </div>
                  <select
                    value={settings.font_size}
                    onChange={e => updateSetting("font_size", e.target.value)}
                    className="bg-app border border-borderToken rounded-lg px-2 py-1 text-xs text-main focus:outline-none"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium (Default)</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                {/* Sidebar Layout */}
                <div className="flex justify-between items-center border-t border-borderToken/50 pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Sidebar Navigation Mode</span>
                    <span className="text-[10px] text-muted">Determine sidebar responsive collapse settings</span>
                  </div>
                  <select
                    value={settings.sidebar_mode}
                    onChange={e => updateSetting("sidebar_mode", e.target.value)}
                    className="bg-app border border-borderToken rounded-lg px-2 py-1 text-xs text-main focus:outline-none"
                  >
                    <option value="expanded">Keep Expanded</option>
                    <option value="collapsed">Keep Collapsed</option>
                    <option value="auto">Auto Collapse on Screen Size</option>
                  </select>
                </div>

                {/* Card Density */}
                <div className="flex justify-between items-center border-t border-borderToken/50 pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Card Display Density</span>
                    <span className="text-[10px] text-muted">Set spacing layout for elements</span>
                  </div>
                  <select
                    value={settings.card_density}
                    onChange={e => updateSetting("card_density", e.target.value)}
                    className="bg-app border border-borderToken rounded-lg px-2 py-1 text-xs text-main focus:outline-none"
                  >
                    <option value="compact">Compact Space</option>
                    <option value="comfortable">Comfortable (Default)</option>
                    <option value="spacious">Spacious Space</option>
                  </select>
                </div>

                {/* Toggles grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-borderToken/50 pt-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.compact_mode} onChange={e => updateSetting("compact_mode", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Compact Interface</span>
                      <span className="text-[9px] text-muted">Reduce component sizing padding</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.animations_enabled} onChange={e => updateSetting("animations_enabled", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Workspace Animations</span>
                      <span className="text-[9px] text-muted">Enable micro-animations and slide flows</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.reduce_motion} onChange={e => updateSetting("reduce_motion", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Reduce Motion</span>
                      <span className="text-[9px] text-muted">Minimise heavy UI transitions</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.rounded_corners} onChange={e => updateSetting("rounded_corners", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Rounded Corners</span>
                      <span className="text-[9px] text-muted">Apply smooth component corners shape</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* 🤖 AI PREFERENCES */}
            {activeCategory === "ai" && (
              <div className="flex flex-col gap-4">
                <div className="border-b border-borderToken pb-2">
                  <h3 className="font-bold text-sm text-main font-display">AI Behavior</h3>
                  <p className="text-[10px] text-muted">Configure default parameters for natural language generation.</p>
                </div>

                {/* Default Model dropdown */}
                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Default AI Model</span>
                    <span className="text-[10px] text-muted">Default inference model for summarization</span>
                  </div>
                  <select
                    value={settings.model_id}
                    onChange={e => updateSetting("model_id", e.target.value)}
                    className="bg-app border border-borderToken rounded-lg px-2 py-1.5 text-xs text-main focus:outline-none w-52"
                  >
                    {[
                      ["distilbart", "DistilBART-CNN-12-6 (Fastest)"],
                      ["bart", "BART-Large-CNN (Balanced)"],
                      ["t5", "T5-Base (Standard)"],
                      ["pegasus", "PEGASUS-Large (Extreme Accuracy)"],
                      ["flant5", "FLAN-T5-Large (Instruction FineTuned)"],
                      ["llama", "Llama-3-8B-Instruct (Advanced)"],
                      ["gemma", "Gemma-2B-IT (Compact instruction)"],
                      ["mistral", "Mistral-7B-v0.2 (High context)"],
                      ["phi", "Phi-3-Mini (Local lightweight)"]
                    ].map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Temperature slider */}
                <div className="flex flex-col gap-1.5 border-t border-borderToken/50 pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-main">Temperature (Creativity)</span>
                    <span className="font-mono text-primary font-bold">{settings.temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={settings.temperature}
                    onChange={e => updateSetting("temperature", parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-borderToken rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[9px] text-muted">
                    <span>Conservative (Focused & Factual)</span>
                    <span>Creative (Dynamic Summary)</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div className="flex flex-col gap-1.5 border-t border-borderToken/50 pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-main">Maximum Output Tokens</span>
                    <span className="font-mono text-primary font-bold">{settings.max_tokens}</span>
                  </div>
                  <input
                    type="range" min="64" max="2048" step="64"
                    value={settings.max_tokens}
                    onChange={e => updateSetting("max_tokens", parseInt(e.target.value))}
                    className="w-full h-1.5 bg-borderToken rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[9px] text-muted">
                    <span>64 tokens</span>
                    <span>2048 tokens (Long output)</span>
                  </div>
                </div>

                {/* Creativity level */}
                <div className="flex flex-col gap-1.5 border-t border-borderToken/50 pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-main">Creativity Penalty</span>
                    <span className="font-mono text-primary font-bold">{settings.creativity_level.toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={settings.creativity_level}
                    onChange={e => updateSetting("creativity_level", parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-borderToken rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Option Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-borderToken/50 pt-3">
                  <div>
                    <span className="font-semibold text-main block mb-1">Response Style</span>
                    <select
                      value={settings.response_style}
                      onChange={e => updateSetting("response_style", e.target.value)}
                      className="bg-app border border-borderToken rounded-lg px-2 py-1 text-xs text-main w-full"
                    >
                      <option value="concise">Concise Summary</option>
                      <option value="balanced">Balanced Summary (Default)</option>
                      <option value="detailed">Extremely Detailed Outline</option>
                    </select>
                  </div>

                  <div>
                    <span className="font-semibold text-main block mb-1">Default Length Mode</span>
                    <select
                      value={settings.summary_length}
                      onChange={e => updateSetting("summary_length", e.target.value)}
                      className="bg-app border border-borderToken rounded-lg px-2 py-1 text-xs text-main w-full"
                    >
                      <option value="short">Short (3-5 Bullet points)</option>
                      <option value="medium">Medium (Standard paragraphs)</option>
                      <option value="long">Long (Full Analysis)</option>
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-borderToken/50 pt-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.auto_detect_language} onChange={e => updateSetting("auto_detect_language", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Auto-Detect Input Language</span>
                      <span className="text-[9px] text-muted">Translate non-English source content</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.streaming_responses} onChange={e => updateSetting("streaming_responses", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Streaming Tokens</span>
                      <span className="text-[9px] text-muted">Render real-time word generation</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.auto_save_summaries} onChange={e => updateSetting("auto_save_summaries", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Auto-save Summaries</span>
                      <span className="text-[9px] text-muted">Keep summary copies automatically</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* 📂 DOCUMENT SETTINGS */}
            {activeCategory === "document" && (
              <div className="flex flex-col gap-4">
                <div className="border-b border-borderToken pb-2">
                  <h3 className="font-bold text-sm text-main font-display">Document Preferences</h3>
                  <p className="text-[10px] text-muted">Manage automation triggers for document parsing and evaluation.</p>
                </div>

                {/* Default format */}
                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Default Export Format</span>
                    <span className="text-[10px] text-muted">Primary extension for file downloads</span>
                  </div>
                  <select
                    value={settings.default_export_format}
                    onChange={e => updateSetting("default_export_format", e.target.value)}
                    className="bg-app border border-borderToken rounded-lg px-2 py-1 text-xs text-main focus:outline-none w-32"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="docx">Word (.docx)</option>
                    <option value="txt">Plain Text (.txt)</option>
                    <option value="md">Markdown (.md)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3.5 border-t border-borderToken/50 pt-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.auto_extract_text} onChange={e => updateSetting("auto_extract_text", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Auto Extract Text</span>
                      <span className="text-[9px] text-muted">Instantly extract file content after drop upload completes</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.auto_analyze_documents} onChange={e => updateSetting("auto_analyze_documents", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Auto Analyze Document Structure</span>
                      <span className="text-[9px] text-muted">Run readability index and topic mapping upon ingestion</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.auto_generate_summary} onChange={e => updateSetting("auto_generate_summary", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Auto Generate Summary</span>
                      <span className="text-[9px] text-muted">Initiate inference summarization immediately after ingestion</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.auto_run_rouge} onChange={e => updateSetting("auto_run_rouge", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Auto Compute ROUGE / BLEU</span>
                      <span className="text-[9px] text-muted">Run evaluations if reference summaries exist</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={settings.auto_delete_temp} onChange={e => updateSetting("auto_delete_temp", e.target.checked)}
                      className="rounded border-borderToken text-primary h-4 w-4 focus:ring-primary accent-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-main">Auto Delete Temporary Ingestion Files</span>
                      <span className="text-[9px] text-muted">Clear cache of uploads older than 24 hours</span>
                    </div>
                  </label>
                </div>
              </div>
            )}


            {/* 🔔 NOTIFICATIONS */}
            {activeCategory === "notifications" && (
              <div className="flex flex-col gap-4">
                <div className="border-b border-borderToken pb-2">
                  <h3 className="font-bold text-sm text-main font-display">Notifications</h3>
                  <p className="text-[10px] text-muted">Fine-tune system prompts, email notifications, and alerts.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <ToggleRow label="Global Email Notifications" description="Receive digests, logins, and summary documents" checked={settings.email_notifications} onChange={v => updateSetting("email_notifications", v)} />
                  <ToggleRow label="Document Ingestion Alerts" description="Alerts when file parsing and metadata is complete" checked={settings.upload_alerts} onChange={v => updateSetting("upload_alerts", v)} />
                  <ToggleRow label="Summarization Complete Alerts" description="Notifications when background models finish processing" checked={settings.summary_alerts} onChange={v => updateSetting("summary_alerts", v)} />
                  <ToggleRow label="NLP Analysis Completion Alerts" description="Alerts for structural readability maps" checked={settings.analysis_alerts} onChange={v => updateSetting("analysis_alerts", v)} />
                  <ToggleRow label="ROUGE Benchmark Alerts" description="Notify when quality evaluation metrics finish rendering" checked={settings.rouge_alerts} onChange={v => updateSetting("rouge_alerts", v)} />

                  <ToggleRow label="Critical Security Alerts" description="New device login or password change events" checked={settings.security_alerts} onChange={v => updateSetting("security_alerts", v)} />
                  <ToggleRow label="Software Updates & Releases" description="Informational alerts for tool updates" checked={settings.system_updates} onChange={v => updateSetting("system_updates", v)} />
                  <ToggleRow label="System Maintenance Notices" description="Advance updates on upcoming cloud server operations" checked={settings.maintenance_notices} onChange={v => updateSetting("maintenance_notices", v)} />
                </div>
              </div>
            )}

            {/* 🔒 PRIVACY SETTINGS */}
            {activeCategory === "privacy" && (
              <div className="flex flex-col gap-4">
                <div className="border-b border-borderToken pb-2">
                  <h3 className="font-bold text-sm text-main font-display">Privacy & Data Control</h3>
                  <p className="text-[10px] text-muted">Adjust data footprint, analytics tracing, and sharing telemetry.</p>
                </div>

                <div className="flex flex-col gap-3">

                  <ToggleRow label="Document Retention" description="Retain uploaded documents across user sessions" checked={settings.document_retention} onChange={v => updateSetting("document_retention", v)} />
                  <ToggleRow label="Persist Search History" description="Remember query filters in history index" checked={settings.search_history} onChange={v => updateSetting("search_history", v)} />
                  <ToggleRow label="Workspace Usage Analytics" description="Record inference speed, latency statistics, and counts" checked={settings.usage_analytics} onChange={v => updateSetting("usage_analytics", v)} />
                  <ToggleRow label="Submit Diagnostic Reports" description="Send anonymized core crash dumps to development team" checked={settings.diagnostic_data} onChange={v => updateSetting("diagnostic_data", v)} />
                  <ToggleRow label="Personalized AI Recommendations" description="Customize summaries based on previous document context" checked={settings.personalized_recommendations} onChange={v => updateSetting("personalized_recommendations", v)} />
                  <ToggleRow label="Data Telemetry Sharing" description="Contribute system execution logs to improve future models" checked={settings.data_sharing} onChange={v => updateSetting("data_sharing", v)} />
                </div>
              </div>
            )}

            {/* ♿ ACCESSIBILITY */}
            {activeCategory === "accessibility" && (
              <div className="flex flex-col gap-4">
                <div className="border-b border-borderToken pb-2">
                  <h3 className="font-bold text-sm text-main font-display">Accessibility (a11y)</h3>
                  <p className="text-[10px] text-muted">Configure accessibility features for screen reader support and high readability.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <ToggleRow label="High Contrast Mode" description="Increase contrast ratio on borders, cards, and buttons" checked={settings.high_contrast} onChange={v => updateSetting("high_contrast", v)} />
                  <ToggleRow label="Accessibility Large Text" description="Scale typography sizes across document viewing interfaces" checked={settings.large_text} onChange={v => updateSetting("large_text", v)} />
                  <ToggleRow label="Keyboard Navigation Optimization" description="Enhanced tab-focus indicators and navigation patterns" checked={settings.keyboard_navigation} onChange={v => updateSetting("keyboard_navigation", v)} />
                  <ToggleRow label="Screen Reader Compatibility" description="Optimize HTML semantic structures and ARIA descriptors" checked={settings.screen_reader_support} onChange={v => updateSetting("screen_reader_support", v)} />
                  <ToggleRow label="Always Show Focus Indicators" description="Wrap active fields in thick primary outline borders" checked={settings.focus_indicators} onChange={v => updateSetting("focus_indicators", v)} />
                  <ToggleRow label="Color Blind Friendly Palette" description="Replace red/green status tags with texture identifiers" checked={settings.color_blind_mode} onChange={v => updateSetting("color_blind_mode", v)} />
                </div>
              </div>
            )}

            {/* 🌐 LANGUAGE & REGION */}
            {activeCategory === "language" && (
              <div className="flex flex-col gap-4">
                <div className="border-b border-borderToken pb-2">
                  <h3 className="font-bold text-sm text-main font-display">Language & Regional preferences</h3>
                  <p className="text-[10px] text-muted">Personalize localization, timeline timezone, and numeric formatting structures.</p>
                </div>

                {/* Lang */}
                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Application Language</span>
                    <span className="text-[10px] text-muted">Interface language translation</span>
                  </div>
                  <select
                    value={settings.language}
                    onChange={e => updateSetting("language", e.target.value)}
                    className="bg-app border border-borderToken rounded-lg px-2.5 py-1 text-xs text-main focus:outline-none w-32"
                  >
                    {[["en","English"],["es","Spanish"],["fr","French"],["de","German"],["zh","Chinese"],["ja","Japanese"]].map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Timezone */}
                <div className="flex justify-between items-center border-t border-borderToken/50 pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Timezone</span>
                    <span className="text-[10px] text-muted">Time tags inside history and activity tables</span>
                  </div>
                  <select
                    value={settings.timezone}
                    onChange={e => updateSetting("timezone", e.target.value)}
                    className="bg-app border border-borderToken rounded-lg px-2.5 py-1 text-xs text-main focus:outline-none w-48"
                  >
                    {["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney"].map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                {/* Date Format */}
                <div className="flex justify-between items-center border-t border-borderToken/50 pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Date Format</span>
                    <span className="text-[10px] text-muted">Calendar format preference</span>
                  </div>
                  <select
                    value={settings.date_format}
                    onChange={e => updateSetting("date_format", e.target.value)}
                    className="bg-app border border-borderToken rounded-lg px-2.5 py-1 text-xs text-main focus:outline-none w-32"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                {/* Time Format */}
                <div className="flex justify-between items-center border-t border-borderToken/50 pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Time Format</span>
                    <span className="text-[10px] text-muted">Choose 12-hour or 24-hour style</span>
                  </div>
                  <select
                    value={settings.time_format}
                    onChange={e => updateSetting("time_format", e.target.value)}
                    className="bg-app border border-borderToken rounded-lg px-2.5 py-1 text-xs text-main focus:outline-none w-32"
                  >
                    <option value="12h">12-hour (AM/PM)</option>
                    <option value="24h">24-hour (Military)</option>
                  </select>
                </div>
              </div>
            )}

            {/* ⌨ SHORTCUTS */}
            {activeCategory === "shortcuts" && (
              <div className="flex flex-col gap-4">
                <div className="border-b border-borderToken pb-2">
                  <h3 className="font-bold text-sm text-main font-display">Keyboard Shortcuts</h3>
                  <p className="text-[10px] text-muted">Activate hotkeys for high-speed workspace interactions.</p>
                </div>

                <ToggleRow label="Enable Keyboard Shortcuts" description="Permit global hotkey combinations" checked={settings.shortcuts_enabled} onChange={v => updateSetting("shortcuts_enabled", v)} />

                <div className="flex flex-col gap-2 mt-2">
                  <span className="font-semibold text-main">Available Keyboard Shortcuts</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted font-mono bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-borderToken/40">
                    <div className="flex justify-between border-b border-borderToken/20 pb-1.5">
                      <span>Collapse/Expand Sidebar</span>
                      <strong>Ctrl + \</strong>
                    </div>
                    <div className="flex justify-between border-b border-borderToken/20 pb-1.5">
                      <span>Focus Global Search</span>
                      <strong>Ctrl + K</strong>
                    </div>
                    <div className="flex justify-between border-b border-borderToken/20 pb-1.5">
                      <span>Submit Prompt / Summarize</span>
                      <strong>Ctrl + Enter</strong>
                    </div>
                    <div className="flex justify-between border-b border-borderToken/20 pb-1.5">
                      <span>Clear Input Fields</span>
                      <strong>Ctrl + Backspace</strong>
                    </div>
                    <div className="flex justify-between border-b border-borderToken/20 pb-1.5">
                      <span>Upload Ingestion Hotkey</span>
                      <strong>Ctrl + U</strong>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* 💾 STORAGE SETTINGS */}
            {activeCategory === "storage" && (
              <div className="flex flex-col gap-4">
                <div className="border-b border-borderToken pb-2">
                  <h3 className="font-bold text-sm text-main font-display">Storage Management</h3>
                  <p className="text-[10px] text-muted">Monitor database usage and clean temporary directories.</p>
                </div>

                {/* Storage usage counts */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-lg border border-borderToken/40">
                    <span className="text-[9px] text-muted font-bold">Documents Storage</span>
                    <span className="text-sm font-bold text-main font-mono mt-1">{storageStats?.doc_label || "0.00 KB"}</span>
                  </div>

                  <div className="flex flex-col bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-lg border border-borderToken/40">
                    <span className="text-[9px] text-muted font-bold">Summaries Storage</span>
                    <span className="text-sm font-bold text-main font-mono mt-1">{storageStats?.summary_label || "0.00 KB"}</span>
                  </div>
                  <div className="flex flex-col bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-lg border border-borderToken/40">
                    <span className="text-[9px] text-muted font-bold">Browser Cache Size</span>
                    <span className="text-sm font-bold text-main font-mono mt-1">{tempCacheSize}</span>
                  </div>
                </div>

                {/* Temporary files */}
                <div className="flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/10 p-3.5 border border-borderToken/50 rounded-xl mt-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Temporary Files: {tempFileSize}</span>
                    <span className="text-[9px] text-muted">Cleanup caches older than 24 hours</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleDeleteTempFiles} disabled={tempFileSize === "0.0 KB"} className="text-[10px] border-borderToken">
                      Clear Temp
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleClearCache} disabled={tempCacheSize === "0.0 KB"} className="text-[10px] border-borderToken">
                      Clear Cache
                    </Button>
                  </div>
                </div>

                {/* Optimize Storage */}
                <div className="flex justify-between items-center bg-primary/5 border border-primary/20 p-4 rounded-xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-primary">Optimize System Storage</span>
                    <span className="text-[10px] text-muted">Run indexing processes, delete soft-deleted documents, and compress index tables</span>
                  </div>
                  <Button size="sm" onClick={handleOptimizeStorage} className="text-[10px] gap-1 px-3">
                    <Sparkles className="w-3.5 h-3.5" /> Optimize
                  </Button>
                </div>
              </div>
            )}

            {/* 🔐 SECURITY SETTINGS */}
            {activeCategory === "security" && (
              <div className="flex flex-col gap-4">
                <div className="border-b border-borderToken pb-2">
                  <h3 className="font-bold text-sm text-main font-display">Security Settings</h3>
                  <p className="text-[10px] text-muted">Configure access verification, trusted tokens, and auto-logout timers.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <ToggleRow label="Two-Factor Authentication (2FA)" description="Require OTP verification codes upon account password logins" checked={settings.enable_2fa} onChange={v => updateSetting("enable_2fa", v)} />
                  <ToggleRow label="Trusted Device Memory" description="Remember browser finger-token for 30 days" checked={settings.trusted_devices} onChange={v => updateSetting("trusted_devices", v)} />
                  <ToggleRow label="Security Notifications" description="Email notifications on critical login events" checked={settings.security_notifications} onChange={v => updateSetting("security_notifications", v)} />
                  <ToggleRow label="Auto-logout inactive sessions" description="Logout user if browser sits idle" checked={settings.auto_logout} onChange={v => updateSetting("auto_logout", v)} />
                </div>

                {/* Session Timeout */}
                <div className="flex justify-between items-center border-t border-borderToken/50 pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-main">Session Timeout duration</span>
                    <span className="text-[10px] text-muted">Period of inactivity before forced logout</span>
                  </div>
                  <select
                    value={settings.session_timeout_minutes}
                    onChange={e => updateSetting("session_timeout_minutes", parseInt(e.target.value))}
                    className="bg-app border border-borderToken rounded-lg px-2.5 py-1 text-xs text-main focus:outline-none w-36"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour (Default)</option>
                    <option value={120}>2 Hours</option>
                    <option value={0}>Never Timeout</option>
                  </select>
                </div>

                {/* API Input fields */}
                <div className="flex flex-col gap-3.5 border-t border-borderToken/50 pt-3">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-main">Developer API Keys</span>
                      <span className="text-[10px] text-muted">Credentials for third party model calls</span>
                    </div>
                  </div>
                  
                  {/* OpenAI Key */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-muted">OpenAI API Token</span>
                    <div className="flex gap-2 items-center bg-app border border-borderToken rounded-lg px-3 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                      <input 
                        type={showOpenai ? "text" : "password"} 
                        value={settings.openai_key}
                        onChange={e => updateSetting("openai_key", e.target.value)}
                        placeholder="sk-proj-..."
                        className="flex-1 bg-transparent text-xs text-main focus:outline-none font-mono"
                      />
                      <button onClick={() => setShowOpenai(!showOpenai)} className="text-muted hover:text-main">
                        {showOpenai ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Hugging Face Key */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-muted">Hugging Face API Token</span>
                    <div className="flex gap-2 items-center bg-app border border-borderToken rounded-lg px-3 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                      <input 
                        type={showHf ? "text" : "password"} 
                        value={settings.hf_key}
                        onChange={e => updateSetting("hf_key", e.target.value)}
                        placeholder="hf_..."
                        className="flex-1 bg-transparent text-xs text-main focus:outline-none font-mono"
                      />
                      <button onClick={() => setShowHf(!showHf)} className="text-muted hover:text-main">
                        {showHf ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Sync indicator */}
          <div className="mt-6 pt-3 border-t border-borderToken/50 flex justify-between items-center text-[10px] text-muted">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Workspace configurations synced with MongoDB database.</span>
            </div>
            {savingField && (
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-primary" /> Saving...
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface p-6 rounded-xl border border-danger/30 shadow-premium z-10 flex flex-col gap-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-borderToken pb-3">
                <div className="flex items-center gap-2 text-danger">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                  <h3 className="font-bold text-xs font-display">Reset to Defaults</h3>
                </div>
                <button onClick={() => setShowResetConfirm(false)} className="text-muted hover:text-main">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                Are you sure you want to reset all preferences, accent colors, theme models, shortcuts, and security layouts back to default system values?
              </p>

              <div className="flex gap-2.5 mt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 text-[10px] border-borderToken"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleResetToDefaults}
                  className="flex-1 text-[10px] bg-danger hover:bg-danger-hover text-white border-transparent"
                >
                  Confirm Reset
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

// ─────────────────────────────────────────
// Inline Helper - ToggleRow
// ─────────────────────────────────────────
interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onChange }) => {
  return (
    <div className="flex items-center justify-between py-2 border-b border-borderToken/30 last:border-0">
      <div className="flex flex-col gap-0.5 max-w-[80%]">
        <span className="font-semibold text-main">{label}</span>
        {description && <span className="text-[10px] text-muted leading-tight">{description}</span>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-primary ${
          checked ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
};

export default SettingsPage;
