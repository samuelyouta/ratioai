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
import RequireSubscription from "./components/RequireSubscription";
import AuthSync from "./components/AuthSync";
import AuthDeepLink from "./components/AuthDeepLink";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import SignIn from "./pages/app/SignIn";
import AuthCallback from "./pages/app/AuthCallback";
import NativeAuthBridge from "./pages/app/NativeAuthBridge";
import AuthEntry from "./components/AuthEntry";
import Paywall from "./pages/app/Paywall";
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
  useHardwareBack();

  return (
    <Routes>
      {/* Preserve OAuth ?code= if Supabase returns to Site URL (/) — still used on web */}
      <Route path="/" element={<AuthEntry fallbackTo="/app/welcome" />} />
      <Route path="/waitlist" element={<Waitlist />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/app" element={<Navigate to="/app/today" replace />} />
      <Route path="/app/welcome" element={<AppWelcome />} />
      <Route path="/app/onboarding/goal" element={<StepGoal />} />
      <Route path="/app/onboarding/name" element={<StepName />} />
      <Route path="/app/onboarding/gender" element={<StepGender />} />
      <Route path="/app/onboarding/dob" element={<StepDob />} />
      <Route path="/app/onboarding/body" element={<StepBody />} />
      <Route path="/app/onboarding/activity" element={<StepActivity />} />
      <Route path="/app/onboarding/source" element={<StepSource />} />
      <Route path="/app/onboarding/blocker" element={<StepBlocker />} />
      <Route path="/app/onboarding/analyzing" element={<Analyzing />} />
      <Route path="/app/signin" element={<SignIn />} />
      {/* Must NOT require onboarding — OAuth/email return here before gates */}
      <Route path="/app/auth/callback" element={<AuthCallback />} />
      <Route path="/app/auth/native-bridge" element={<NativeAuthBridge />} />
      <Route path="/app/paywall" element={<RequireOnboarding><RequireAuth><Paywall /></RequireAuth></RequireOnboarding>} />
      <Route path="/app/today" element={<RequireOnboarding><RequireAuth><RequireSubscription><Today /></RequireSubscription></RequireAuth></RequireOnboarding>} />
      <Route path="/app/insights" element={<RequireOnboarding><RequireAuth><RequireSubscription><Insights /></RequireSubscription></RequireAuth></RequireOnboarding>} />
      <Route path="/app/profile" element={<RequireOnboarding><RequireAuth><RequireSubscription><Profile /></RequireSubscription></RequireAuth></RequireOnboarding>} />
      <Route path="/app/log" element={<RequireOnboarding><RequireAuth><RequireSubscription><Log /></RequireSubscription></RequireAuth></RequireOnboarding>} />
      <Route path="/app/analyze" element={<RequireOnboarding><RequireAuth><RequireSubscription><Analyze /></RequireSubscription></RequireAuth></RequireOnboarding>} />
      <Route path="/app/history" element={<RequireOnboarding><RequireAuth><RequireSubscription><History /></RequireSubscription></RequireAuth></RequireOnboarding>} />
      <Route path="/app/history/:id" element={<RequireOnboarding><RequireAuth><RequireSubscription><MealDetails /></RequireSubscription></RequireAuth></RequireOnboarding>} />
      <Route path="/app/manual" element={<RequireOnboarding><RequireAuth><RequireSubscription><Manual /></RequireSubscription></RequireAuth></RequireOnboarding>} />
      <Route path="/app/describe" element={<RequireOnboarding><RequireAuth><RequireSubscription><Describe /></RequireSubscription></RequireAuth></RequireOnboarding>} />
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
          <SubscriptionProvider>
            <AuthSync />
            <AuthDeepLink />
            <AppRoutes />
          </SubscriptionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
