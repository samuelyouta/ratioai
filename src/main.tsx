import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { configureRevenueCat } from "@/lib/subscriptions";
import { initMetaAds } from "@/lib/metaAds";

void configureRevenueCat();
void initMetaAds();

createRoot(document.getElementById("root")!).render(<App />);
