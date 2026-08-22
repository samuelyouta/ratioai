import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { configureRevenueCat } from "@/lib/subscriptions";

void configureRevenueCat();

createRoot(document.getElementById("root")!).render(<App />);
