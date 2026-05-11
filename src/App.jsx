import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { base44 } from "@/api/client";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

import AppLayout from "@/components/layout/AppLayout";
import AdminDashboard from "@/pages/AdminDashboard";
import Registration from "@/pages/Registration";
import QueueMonitor from "@/pages/QueueMonitor";
import NakesBooth from "@/pages/NakesBooth";
import Participants from "@/pages/Participants";
import ParticipantDetail from "@/pages/ParticipantDetail";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/SettingsPage";
import LEDMonitor from "@/pages/LEDMonitor";
import MobileMonitor from "@/pages/MobileMonitor";
import DemoLauncher from "@/pages/DemoLauncher";
import PublicRegistration from "@/pages/PublicRegistration";
import QuotaMaster from "@/pages/QuotaMaster";


const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, user, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Memuat sistem...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }
  }

  const isAdmin = user?.role === "admin";

  return (
    <Routes>
      {/* Fullscreen public routes — no sidebar */}
      <Route path="/led-monitor" element={<LEDMonitor />} />
      <Route path="/mobile-monitor" element={<MobileMonitor />} />
      <Route path="/demo" element={<DemoLauncher />} />
      <Route path="/register" element={<PublicRegistration />} />

      <Route element={<AppLayout user={user} />}>
        {/* Admin Routes */}
        <Route path="/" element={isAdmin ? <AdminDashboard /> : <Navigate to="/booth" replace />} />
        <Route path="/registration" element={isAdmin ? <Registration /> : <Navigate to="/booth" replace />} />
        <Route path="/participants" element={isAdmin ? <Participants /> : <Navigate to="/booth" replace />} />
        <Route path="/participants/detail" element={isAdmin ? <ParticipantDetail /> : <Navigate to="/booth" replace />} />
        <Route path="/reports" element={isAdmin ? <Reports /> : <Navigate to="/booth" replace />} />
        <Route path="/settings" element={isAdmin ? <SettingsPage /> : <Navigate to="/booth" replace />} />
        <Route path="/quota" element={isAdmin ? <QuotaMaster /> : <Navigate to="/booth" replace />} />

        {/* Shared Routes */}
        <Route path="/booth" element={<NakesBooth />} />
        <Route path="/queue-monitor" element={<QueueMonitor />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;