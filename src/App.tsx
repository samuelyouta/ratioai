import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Welcome from "./pages/Welcome";
import GoalSelection from "./pages/GoalSelection";
import ProfileSetup from "./pages/ProfileSetup";
import CalorieTarget from "./pages/CalorieTarget";
import HomePage from "./pages/HomePage";
import CameraCapture from "./pages/CameraCapture";
import AIResult from "./pages/AIResult";
import ManualEdit from "./pages/ManualEdit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/goals" element={<GoalSelection />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/calorie-target" element={<CalorieTarget />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/camera" element={<CameraCapture />} />
          <Route path="/ai-result" element={<AIResult />} />
          <Route path="/manual-edit" element={<ManualEdit />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
