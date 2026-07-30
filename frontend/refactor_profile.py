import re

with open("src/presentation/pages/Profile.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# We will just write a completely new file
new_content = """import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User as UserIcon,
  Mail,
  Globe,
  Calendar,
  Edit3,
  Save,
  X,
  Camera,
  RefreshCw,
  AlertTriangle,
  MapPin,
  CheckCircle,
  AtSign,
  Clock,
  MessageSquare
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { apiClient } from "@/api";
import { useToast } from "@/context/ToastContext";
import { useAuthStore } from "@/state";
import { Country, State, City } from "country-state-city";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type Tab = "overview" | "edit";

interface FullProfile {
  id: string;
  email: string;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  role: string;
  name: string;
  first_name: string;
  last_name: string;
  display_name: string;
  username: string;
  bio: string;
  country: string;
  state: string;
  city: string;
  timezone: string;
  language: string;
  theme: string;
  avatar: string;
  avatar_data: string;
  avatar_mime: string;
  has_avatar_data: boolean;
  last_active: string | null;
  last_login: string | null;
}

// ─────────────────────────────────────────
// TabButton
// ─────────────────────────────────────────
function TabButton({ id, label, icon: Icon, active, onClick }: {
  id: Tab; label: string; icon: React.ComponentType<any>; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap
        ${active
          ? "bg-primary text-white shadow-sm"
          : "text-muted hover:text-main hover:bg-slate-100 dark:hover:bg-slate-800/40"
        }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, action }: {
  icon: React.ComponentType<any>; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b border-borderToken pb-3 mb-4">
      <div className="flex flex-col gap-0.5">
        <h4 className="font-bold text-sm text-main font-display flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-primary" /> {title}
        </h4>
        {subtitle && <p className="text-[10px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────
// FieldRow
// ─────────────────────────────────────────
function FieldRow({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: React.ComponentType<any> }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-muted flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </span>
      <span className="text-xs text-main font-medium bg-slate-50 dark:bg-slate-800/30 px-2.5 py-1.5 rounded-lg border border-borderToken/50 min-h-[28px] flex items-center">
        {value || <span className="text-muted italic">Not set</span>}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────
// EditField
// ─────────────────────────────────────────
function EditField({ label, value, onChange, placeholder, type = "text", icon: Icon, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ComponentType<any>; multiline?: boolean;
}) {
  const cls = "bg-app border border-borderToken rounded-lg px-3 py-1.5 text-xs text-main focus:outline-none focus:ring-1 focus:ring-primary w-full placeholder:text-muted";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-muted flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={cls + " resize-none"}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────
export const Profile: React.FC = () => {
  const { success, error: toastError } = useToast();
  const { fetchProfile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [editForm, setEditForm] = useState({
    first_name: "", last_name: "", display_name: "", username: "",
    email: "", bio: "", country: "", city: "", state: "", timezone: "", language: "",
  });
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarMime, setAvatarMime] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      let p: FullProfile | null = null;
      try {
        const pRes = await apiClient.get("/auth/profile/full");
        p = pRes.data;
      } catch (err) {
        console.error("Failed to load profile details", err);
      }

      if (!p) {
        setLoading(false);
        return;
      }

      setProfile(p);
      setEditForm({
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        display_name: p.display_name || "",
        username: p.username || "",
        email: p.email || "",
        bio: p.bio || "",
        country: p.country || "",
        state: p.state || "",
        city: p.city || "",
        timezone: p.timezone || "",
        language: p.language || "",
      });

      // Avatar
      if (p.avatar_data) {
        setAvatarPreview(`data:${p.avatar_mime};base64,${p.avatar_data}`);
      } else if (p.avatar) {
        setAvatarPreview(p.avatar);
      } else {
        setAvatarPreview("");
      }

    } catch (err) {
      console.error("Failed to load profile fully", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Username validation effect
  useEffect(() => {
    const checkUser = async () => {
      if (!editForm.username || editForm.username === profile?.username) {
        setUsernameAvailable(null);
        return;
      }
      setCheckingUsername(true);
      try {
        const res = await apiClient.get(`/auth/check-username?username=${editForm.username}`);
        setUsernameAvailable(res.data.available);
      } catch (e) {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    };
    const timer = setTimeout(checkUser, 500);
    return () => clearTimeout(timer);
  }, [editForm.username, profile?.username]);

  // ── Avatar Upload ──
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      toastError("Only PNG, JPG, JPEG, and WEBP formats are supported.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toastError("Image must be under 2MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarMime(file.type);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        await apiClient.post("/auth/upload-avatar", { avatar_data: base64, avatar_mime: avatarMime });
        success("Profile photo updated!");
        await fetchAll();
        fetchProfile();
        setAvatarFile(null);
      };
      reader.readAsDataURL(avatarFile);
    } catch {
      toastError("Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await apiClient.delete("/auth/avatar");
      setAvatarPreview("");
      success("Profile photo removed.");
      await fetchAll();
      fetchProfile();
    } catch {
      toastError("Failed to remove avatar.");
    }
  };

  // ── Save Profile ──
  const handleSaveProfile = async () => {
    // Inline validation for required fields
    const required = ["first_name", "display_name", "username", "country", "state", "city", "timezone", "language"];
    const missing = required.filter(k => !(editForm as any)[k] || String((editForm as any)[k]).trim() === "");
    if (missing.length > 0) {
      toastError(`Please fill in all required fields: ${missing.join(", ").replace(/_/g, " ")}`);
      return;
    }
    
    setSavingProfile(true);
    try {
      await apiClient.put("/auth/profile/full", editForm);
      success("Profile updated successfully!");
      await fetchAll();
      fetchProfile();
    } catch (e: any) {
      toastError(e?.response?.data?.detail || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted text-xs">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-12 animate-in fade-in duration-300">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-bold text-main font-display mb-2">Failed to Load Profile</h2>
        <p className="text-xs text-muted mb-6">
          There was an error retrieving your profile data from the server. Please try reloading.
        </p>
        <Button onClick={fetchAll} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Retry Loading
        </Button>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
    { id: "overview",     label: "Overview",    icon: UserIcon },
    { id: "edit",         label: "Edit Profile",icon: Edit3 },
  ];

  const avatarSrc = avatarPreview || undefined;

  // ── Profile Completion Logic ──
  const requiredFields = [
    { key: "first_name", label: "First Name" },
    { key: "display_name", label: "Display Name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "country", label: "Country" },
    { key: "state", label: "State" },
    { key: "city", label: "City" },
    { key: "timezone", label: "Timezone" },
    { key: "language", label: "Language" },
    { key: "avatar_data", label: "Profile Photo", isAvatar: true }
  ];

  let completedFieldsCount = 0;
  const missingFields: string[] = [];

  // Note: we calculate completion based on the current profile in DB, 
  // but if the user wants it to update "instantly" based on the form,
  // we could base it on `editForm` when on the edit tab.
  // The requirements say: "Completion percentage must update instantly."
  // So we will base it on editForm!
  
  requiredFields.forEach(f => {
    if (f.isAvatar) {
      if (avatarPreview) completedFieldsCount++;
      else missingFields.push(f.label);
    } else {
      const val = (editForm as any)[f.key];
      if (val && String(val).trim() !== "") completedFieldsCount++;
      else missingFields.push(f.label);
    }
  });

  const completionPct = Math.round((completedFieldsCount / requiredFields.length) * 100);

  // Timezone options generator
  const timezoneOptions = Intl.supportedValuesOf('timeZone').map(tz => ({
    value: tz,
    label: tz.replace(/_/g, ' ')
  }));

  // Country options
  const countryOptions = Country.getAllCountries().map(c => ({
    value: c.isoCode,
    label: c.name
  }));

  // State options
  const stateOptions = editForm.country ? State.getStatesOfCountry(editForm.country).map(s => ({
    value: s.isoCode,
    label: s.name
  })) : [];

  // City options
  const cityOptions = editForm.state && editForm.country ? City.getCitiesOfState(editForm.country, editForm.state).map(c => ({
    value: c.name,
    label: c.name
  })) : [];

  // ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-surface p-5 rounded-xl border border-borderToken shadow-sm">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <Avatar 
              src={avatarSrc} 
              name={profile.name} 
              size="lg" 
              className="h-24 w-24 text-2xl border-2 border-primary/30 shadow-lg object-cover" 
            />
            <button
              onClick={() => setActiveTab("edit")}
              className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-1 translate-y-1 hover:scale-105"
              title="Change Photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold text-main font-display tracking-tight flex items-center gap-2">
              {profile.name}
            </h1>
            <div className="flex items-center gap-2 text-muted">
              <span className="flex items-center gap-1"><AtSign className="w-3 h-3" />{profile.username || "username"}</span>
              <span className="w-1 h-1 rounded-full bg-borderToken" />
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{profile.email}</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${profile.is_verified ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-amber-500 bg-amber-500/10 border-amber-500/20"}`}>
                {profile.is_verified ? "✓ Verified" : "⚠ Unverified"}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border text-primary bg-primary/10 border-primary/20 capitalize">
                {profile.role}
              </span>
              <span className="text-[9px] text-muted flex items-center gap-1 ml-2">
                <Calendar className="w-3 h-3" /> Member since {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Completion Widget */}
        <div className="flex flex-col gap-2 min-w-[200px] bg-app/50 p-3 rounded-lg border border-borderToken">
          <div className="flex justify-between items-center">
            <span className="font-bold text-main">Profile Completion</span>
            <span className="font-bold text-primary">{completionPct}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          {completionPct < 100 && (
            <span className="text-[9px] text-amber-600 dark:text-amber-500 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> Missing: {missingFields[0]} {missingFields.length > 1 ? `+${missingFields.length - 1} more` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-col lg:flex-row gap-4 mt-2">
        {/* Sidebar Nav */}
        <Card className="p-2 lg:w-64 h-fit flex lg:flex-col gap-1 overflow-x-auto custom-scrollbar flex-shrink-0">
          {TABS.map(tab => (
            <TabButton
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </Card>

        {/* Content Area */}
        <Card className="flex-1 p-5 md:p-6 min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <SectionHeader icon={UserIcon} title="Overview" subtitle="Public profile information" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <FieldRow icon={UserIcon} label="Display Name" value={profile.display_name} />
                    <FieldRow icon={AtSign} label="Username" value={profile.username} />
                    <FieldRow icon={Mail} label="Email Address" value={profile.email} />
                    <FieldRow icon={MessageSquare} label="Bio" value={profile.bio} />
                    <FieldRow icon={Globe} label="Language" value={profile.language} />
                    <FieldRow icon={Clock} label="Timezone" value={profile.timezone?.replace(/_/g, ' ')} />
                    <FieldRow 
                      icon={MapPin} 
                      label="Location" 
                      value={[
                        profile.city, 
                        profile.state && profile.country ? State.getStateByCodeAndCountry(profile.state, profile.country)?.name : profile.state, 
                        profile.country ? Country.getCountryByCode(profile.country)?.name : profile.country
                      ].filter(Boolean).join(", ") || "—"}
                    />
                  </div>
                </div>
              )}

              {activeTab === "edit" && (
                <div className="space-y-6">
                  <SectionHeader icon={Edit3} title="Edit Profile" subtitle="Update your personal details" />
                  
                  {/* Photo Upload */}
                  <div className="flex flex-col gap-3 pb-4 border-b border-borderToken/50">
                    <span className="text-[10px] font-bold text-muted flex items-center gap-1"><Camera className="w-3 h-3" /> Profile Photo</span>
                    <div className="flex items-center gap-4">
                      <Avatar 
                        src={avatarSrc} 
                        name={profile.name} 
                        size="lg" 
                        className="h-16 w-16 text-xl object-cover" 
                      />
                      <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarFileChange} />
                        {!avatarFile ? (
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Choose File</Button>
                        ) : (
                          <>
                            <Button size="sm" loading={uploadingAvatar} onClick={handleUploadAvatar}>Upload</Button>
                            <Button variant="ghost" size="sm" onClick={() => { setAvatarFile(null); setAvatarPreview(profile.avatar_data ? `data:${profile.avatar_mime};base64,${profile.avatar_data}` : profile.avatar || ""); }}>Cancel</Button>
                          </>
                        )}
                        {avatarSrc && !avatarFile && (
                          <Button variant="ghost" size="sm" className="text-danger hover:text-danger hover:bg-danger/10" onClick={handleRemoveAvatar}>Remove</Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <EditField icon={UserIcon} label="First Name *" value={editForm.first_name} onChange={v => setEditForm(f => ({ ...f, first_name: v }))} placeholder="John" />
                    <EditField icon={UserIcon} label="Last Name" value={editForm.last_name} onChange={v => setEditForm(f => ({ ...f, last_name: v }))} placeholder="Doe" />
                    <EditField icon={UserIcon} label="Display Name *" value={editForm.display_name} onChange={v => setEditForm(f => ({ ...f, display_name: v }))} placeholder="John Doe" />
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-muted flex items-center gap-1"><AtSign className="w-3 h-3" /> Username *</span>
                      <div className="relative">
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={e => setEditForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                          placeholder="johndoe"
                          className="bg-app border border-borderToken rounded-lg px-3 py-1.5 text-xs text-main focus:outline-none focus:ring-1 focus:ring-primary w-full pr-8"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          {checkingUsername && <RefreshCw className="w-3.5 h-3.5 text-muted animate-spin" />}
                          {usernameAvailable === true && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                          {usernameAvailable === false && <X className="w-3.5 h-3.5 text-danger" />}
                        </div>
                      </div>
                      {usernameAvailable === false && <span className="text-[9px] text-danger mt-0.5">Username is already taken</span>}
                    </div>

                    <div className="md:col-span-2">
                      <EditField icon={MessageSquare} label="Bio" value={editForm.bio} onChange={v => setEditForm(f => ({ ...f, bio: v }))} placeholder="Tell us about yourself..." multiline />
                    </div>

                    {/* Country Selection */}
                    <div>
                      <span className="text-[10px] font-bold text-muted flex items-center gap-1 mb-1"><Globe className="w-3 h-3" /> Country *</span>
                      <SearchableSelect
                        options={countryOptions}
                        value={editForm.country}
                        onChange={(val) => {
                          const cData = Country.getCountryByCode(val);
                          setEditForm(f => ({
                            ...f,
                            country: val,
                            state: "",
                            city: "",
                            timezone: cData?.timezones?.[0]?.zoneName || f.timezone
                          }));
                        }}
                        placeholder="Select Country"
                        searchPlaceholder="Search countries..."
                      />
                    </div>
                    
                    {/* State Selection */}
                    <div>
                      <span className="text-[10px] font-bold text-muted flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" /> State / Province *</span>
                      <SearchableSelect
                        options={stateOptions}
                        value={editForm.state}
                        onChange={(val) => setEditForm(f => ({ ...f, state: val, city: "" }))}
                        placeholder="Select State"
                        searchPlaceholder="Search states..."
                        disabled={!editForm.country}
                      />
                    </div>
                    
                    {/* City Selection */}
                    <div>
                      <span className="text-[10px] font-bold text-muted flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" /> City *</span>
                      <SearchableSelect
                        options={cityOptions}
                        value={editForm.city}
                        onChange={(val) => setEditForm(f => ({ ...f, city: val }))}
                        placeholder="Select City"
                        searchPlaceholder="Search cities..."
                        disabled={!editForm.state}
                      />
                    </div>

                    {/* Timezone Selection */}
                    <div>
                      <span className="text-[10px] font-bold text-muted flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Timezone *</span>
                      <SearchableSelect
                        options={timezoneOptions}
                        value={editForm.timezone}
                        onChange={(val) => setEditForm(f => ({ ...f, timezone: val }))}
                        placeholder="Select Timezone"
                        searchPlaceholder="Search timezones..."
                      />
                    </div>

                    {/* Language Selection */}
                    <div>
                      <span className="text-[10px] font-bold text-muted flex items-center gap-1 mb-1"><Globe className="w-3 h-3" /> Language *</span>
                      <select
                        value={editForm.language}
                        onChange={e => setEditForm(f => ({ ...f, language: e.target.value }))}
                        className="bg-app border border-borderToken rounded-lg px-3 py-1.5 text-xs text-main focus:outline-none focus:ring-1 focus:ring-primary w-full"
                      >
                        <option value="en">English (US)</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="zh">中文</option>
                      </select>
                    </div>

                  </div>

                  <div className="pt-4 border-t border-borderToken flex justify-end gap-3 mt-4">
                    <Button variant="outline" onClick={fetchAll} disabled={savingProfile}>Discard Changes</Button>
                    <Button onClick={handleSaveProfile} loading={savingProfile} className="gap-2">
                      <Save className="w-3.5 h-3.5" /> Save Profile
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
"""

with open("src/presentation/pages/Profile.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Rewrite successful")
