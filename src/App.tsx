import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { startReminderScheduler, ensureNotificationPermission } from "@/lib/reminders";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import Waitlist from "./pages/Waitlist";
import NotFound from "./pages/NotFound";
import RequireOnboarding from "./components/RequireOnboarding";
import AppWelcome from "./pages/app/AppWelcome";
import StepGoal from "./pages/app/onboarding/StepGoal";
import StepGender from "./pages/app/onboarding/StepGender";
import StepBody from "./pages/app/onboarding/StepBody";
import StepActivity from "./pages/app/onboarding/StepActivity";
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

      {/* App entry — redirects into onboarding or today */}
      <Route path="/app" element={<Navigate to="/app/today" replace />} />
      <Route path="/app/welcome" element={<AppWelcome />} />

      {/* Onboarding (no gate) */}
      <Route path="/app/onboarding/goal" element={<StepGoal />} />
      <Route path="/app/onboarding/gender" element={<StepGender />} />
      <Route path="/app/onboarding/body" element={<StepBody />} />
      <Route path="/app/onboarding/activity" element={<StepActivity />} />

      {/* Gated app routes */}
      <Route path="/app/today" element={<RequireOnboarding><Today /></RequireOnboarding>} />
      <Route path="/app/insights" element={<RequireOnboarding><Insights /></RequireOnboarding>} />
      <Route path="/app/profile" element={<RequireOnboarding><Profile /></RequireOnboarding>} />
      <Route path="/app/log" element={<RequireOnboarding><Log /></RequireOnboarding>} />
      <Route path="/app/analyze" element={<RequireOnboarding><Analyze /></RequireOnboarding>} />
      <Route path="/app/history" element={<RequireOnboarding><History /></RequireOnboarding>} />
      <Route path="/app/history/:id" element={<RequireOnboarding><MealDetails /></RequireOnboarding>} />
      <Route path="/app/manual" element={<RequireOnboarding><Manual /></RequireOnboarding>} />
      <Route path="/app/describe" element={<RequireOnboarding><Describe /></RequireOnboarding>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  useEffect(() => {
    // Best-effort: ask once for browser notification permission, then start
    // the in-app scheduler that checks for the 2 PM lunch reminder.
    ensureNotificationPermission();
    const stop = startReminderScheduler();
    return stop;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
