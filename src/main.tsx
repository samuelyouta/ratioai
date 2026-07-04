import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

async function initRevenueCat() {
  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey: test_mxJvcSoUMFnfohtMEiPrVwcJiVK }); // replace with your real key
}
initRevenueCat();

createRoot(document.getElementById("root")!).render(<App />);