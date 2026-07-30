import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "../layout/DashboardLayout";
import { Spinner } from "@/components";
import { useAuthStore } from "@/state";
import Auth from "../pages/Auth";

// Lazy Loaded page chunks
const Home = lazy(() => import("../pages/Home"));
const AiTools = lazy(() => import("../pages/AiTools"));
const DocumentUpload = lazy(() => import("../pages/DocumentUpload"));

const Trash = lazy(() => import('../pages/Trash').then(m => ({ default: m.Trash })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AdminPanel = lazy(() => import('../pages/AdminPanel').then(m => ({ default: m.AdminPanel })));
const NotificationCenter = lazy(() => import('../pages/NotificationCenter').then(m => ({ default: m.NotificationCenter })));
const DocumentAnalysis = lazy(() => import("../pages/DocumentAnalysis"));
const ROUGEEvaluation = lazy(() => import("../pages/ROUGEEvaluation"));
const Performance = lazy(() => import("../pages/Performance"));
const AboutProject = lazy(() => import("../pages/AboutProject"));
const SummaryHistory = lazy(() => import("../pages/SummaryHistory"));
const Profile = lazy(() => import("../pages/Profile"));
const ModelCatalog = lazy(() => import("../pages/ModelCatalog").then(m => ({ default: m.ModelCatalog })));


export const AppRouter: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="*" element={<Auth />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DashboardLayout>
        <Suspense fallback={
          <div className="flex h-[40vh] w-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ai-tools" element={<AiTools />} />
            <Route path="/upload" element={<DocumentUpload />} />

            <Route path="/history" element={<SummaryHistory />} />
            <Route path="/document-analysis" element={<DocumentAnalysis />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/trash" element={<Trash />} />
            <Route path="/rouge-evaluation" element={<ROUGEEvaluation />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/about" element={<AboutProject />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/models" element={<ModelCatalog />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/notifications" element={<NotificationCenter />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </BrowserRouter>
  );
};

export default AppRouter;
