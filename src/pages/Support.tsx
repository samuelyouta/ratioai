import { useState } from "react";
import { ArrowLeft, ChevronDown, LifeBuoy, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const SUPPORT_EMAIL = "support@ratioai.app";

const faqs = [
  {
    q: "How do I log a meal?",
    a: "Open Log, then snap a photo or pick one from your library. RatioAi analyzes the plate and estimates calories and macros. You can also describe a meal in words or enter items manually.",
  },
  {
    q: "Photo scan failed or says “Load failed”",
    a: "Try a clearer, well-lit photo of the food (avoid screenshots of screens). Allow camera and Photos access in Settings. If it still fails, email us with your device model and iOS version.",
  },
  {
    q: "How do I manage or restore my subscription?",
    a: "Subscriptions are handled through the App Store. Use Restore Purchases on the Profile screen, or manage billing in Settings → Apple ID → Subscriptions.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Profile → Delete Account. This permanently removes your account and associated data. You can also email us if you need help completing a deletion request.",
  },
  {
    q: "Are calorie estimates medical advice?",
    a: "No. RatioAi provides AI-powered estimates for informational purposes only. Always consult a qualified healthcare professional before making significant dietary changes.",
  },
  {
    q: "I can’t sign in with Apple or Google",
    a: "Check your network connection, then try again. For Apple Sign In, make sure you’re signed into iCloud on the device. If the problem continues, tell us which sign-in method you used and any error text you saw.",
  },
];

const Support = () => {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-sm font-semibold">Support</h1>
      </div>

      <main className="flex-1 px-5 py-8 max-w-xl mx-auto w-full space-y-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">RatioAi Support</h2>
            <p className="text-xs text-muted-foreground">Help, FAQ, and contact</p>
          </div>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">Contact us</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary font-medium hover:underline">
              {SUPPORT_EMAIL}
            </a>
            . We usually reply within 1–2 business days.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("RatioAi support request")}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Mail className="w-4 h-4" />
            Email support
          </a>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Include your account email, device, and a short description of the issue so we can help faster.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">FAQ</h3>
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
            {faqs.map((item, index) => {
              const open = openIndex === index;
              return (
                <div key={item.q} className="bg-card">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                    aria-expanded={open}
                  >
                    <span className="text-sm font-medium text-foreground">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <p className="font-bold text-foreground text-sm">Policies</p>
          <p>
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            {" · "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
};

export default Support;
