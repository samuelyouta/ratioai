import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { startReminderScheduler, ensureNotificationPermission } from "@/lib/reminders";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { applyTheme, getActiveTheme } from "@/lib/streak";
import { recordVisit, startSessionAutoSync } from "@/lib/session";
import Waitlist from "./pages/Waitlist";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import RequireOnboarding from "./components/RequireOnboarding";
import RequireAuth from "./components/RequireAuth";
import AuthSync from "./components/AuthSync";
import SignIn from "./pages/app/SignIn";
import AuthCallback from "./pages/app/AuthCallback";
import AppWelcome from "./pages/app/AppWelcome";
import StepGoal from "./pages/app/onboarding/StepGoal";
import StepName from "./pages/app/onboarding/StepName";
import StepGender from "./pages/app/onboarding/StepGender";
import StepDob from "./pages/app/onboarding/StepDob";
import StepBody from "./pages/app/onboarding/StepBody";
import StepSource from "./pages/app/onboarding/StepSource";
import StepBlocker from "./pages/app/onboarding/StepBlocker";
import StepActivity from "./pages/app/onboarding/StepActivity";
import Analyzing from "./pages/app/onboarding/Analyzing";
import Today from "./pages/app/Today";
import Insights from "./pages/app/Insights";
import Profile from "./pages/app/Profile";
import Log from "./pages/app/Log";
import Analyze from "./pages/app/Analyze";
import History from "./pages/app/History";
import MealDetails from "./pages/app/MealDetails";
import Manual from "./pages/app/Manual";
import Describe from "./pages/app/Describe";

const queryClient = new QueryClient();

const AppRoutes = () => {
  // Hardware back button (Android) + Capacitor edge-swipe → router-aware nav.
  useHardwareBack();

  return (
    <Routes>
      {/* Waitlist (pre-launch landing) */}
      <Route path="/" element={<Waitlist />} />
      <Route path="/waitlist" element={<Waitlist />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* App entry — redirects into onboarding or today */}
      <Route path="/app" element={<Navigate to="/app/today" replace />} />
      <Route path="/app/welcome" element={<AppWelcome />} />

      {/* Onboarding (no gate) */}
      <Route path="/app/onboarding/goal" element={<StepGoal />} />
      <Route path="/app/onboarding/name" element={<StepName />} />
      <Route path="/app/onboarding/gender" element={<StepGender />} />
      <Route path="/app/onboarding/dob" element={<StepDob />} />
      <Route path="/app/onboarding/body" element={<StepBody />} />
      <Route path="/app/onboarding/activity" element={<StepActivity />} />
      <Route path="/app/onboarding/source" element={<StepSource />} />
      <Route path="/app/onboarding/blocker" element={<StepBlocker />} />
      <Route path="/app/onboarding/analyzing" element={<Analyzing />} />

      {/* Sign-in (after onboarding, before app) */}
      <Route path="/app/signin" element={<RequireOnboarding><SignIn /></RequireOnboarding>} />
      <Route path="/app/auth/callback" element={<RequireOnboarding><AuthCallback /></RequireOnboarding>} />

      {/* Gated app routes — must be onboarded AND signed in */}
      <Route path="/app/today" element={<RequireOnboarding><RequireAuth><Today /></RequireAuth></RequireOnboarding>} />
      <Route path="/app/insights" element={<RequireOnboarding><RequireAuth><Insights /></RequireAuth></RequireOnboarding>} />
      <Route path="/app/profile" element={<RequireOnboarding><RequireAuth><Profile /></RequireAuth></RequireOnboarding>} />
      <Route path="/app/log" element={<RequireOnboarding><RequireAuth><Log /></RequireAuth></RequireOnboarding>} />
      <Route path="/app/analyze" element={<RequireOnboarding><RequireAuth><Analyze /></RequireAuth></RequireOnboarding>} />
      <Route path="/app/history" element={<RequireOnboarding><RequireAuth><History /></RequireAuth></RequireOnboarding>} />
      <Route path="/app/history/:id" element={<RequireOnboarding><RequireAuth><MealDetails /></RequireAuth></RequireOnboarding>} />
      <Route path="/app/manual" element={<RequireOnboarding><RequireAuth><Manual /></RequireAuth></RequireOnboarding>} />
      <Route path="/app/describe" element={<RequireOnboarding><RequireAuth><Describe /></RequireAuth></RequireOnboarding>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  useEffect(() => {
    ensureNotificationPermission();
    applyTheme(getActiveTheme());
    recordVisit();
    const stopSync = startSessionAutoSync();
    const stop = startReminderScheduler();
    return () => {
      stopSync();
      stop();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || undefined}>
          <AuthSync />
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
