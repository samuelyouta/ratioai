import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { configureRevenueCat } from "@/lib/subscriptions";
import { initAdTracking } from "@/lib/adEvents";

void configureRevenueCat();
initAdTracking();

createRoot(document.getElementById("root")!).render(<App />);
