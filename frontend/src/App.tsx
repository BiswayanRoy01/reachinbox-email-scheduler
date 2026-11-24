import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Login } from "./pages/Login";
import { AuthCallback } from "./pages/AuthCallback";
import { ScheduledEmails } from "./pages/ScheduledEmails";
import { SentEmails } from "./pages/SentEmails";
import { ComposeEmail } from "./pages/ComposeEmail";
import { EmailDetails } from "./pages/EmailDetails";
import { Settings } from "./pages/Settings";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard/scheduled" replace />} />
              <Route path="scheduled" element={<ScheduledEmails />} />
              <Route path="sent" element={<SentEmails />} />
              <Route path="compose" element={<ComposeEmail />} />
              <Route path="emails/:id" element={<EmailDetails />} />
            </Route>

            {/* Protected Settings Route */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Settings />} />
            </Route>

            {/* Default Fallback */}
            <Route path="/" element={<Navigate to="/dashboard/scheduled" replace />} />
            <Route path="*" element={<Navigate to="/dashboard/scheduled" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
