import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-sm font-semibold">Terms of Service</h1>
      </div>

      <main className="flex-1 px-5 py-8 max-w-xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Terms of Service</h2>
            <p className="text-xs text-muted-foreground">Last updated: May 2026</p>
          </div>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">1. Acceptance of Terms</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing or using RatioAi, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">2. Service Description</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            RatioAi provides AI-powered nutrition tracking and meal analysis. Results are estimates based on AI models and should not replace professional medical or dietary advice.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">3. User Accounts</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are responsible for maintaining the confidentiality of your account. You agree to provide accurate information during onboarding and to update it as needed.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">4. Acceptable Use</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You may not misuse the service, attempt to access data you do not own, or use the app for any illegal purpose. We reserve the right to suspend accounts violating these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">5. Disclaimer</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            RatioAi provides nutritional estimates for informational purposes only. Always consult a healthcare professional before making significant dietary changes.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">6. Termination</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may suspend or terminate your access at any time for violations of these terms. You may also delete your account at any time from the Profile page.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">7. Contact</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For questions about these terms, contact us at <span className="text-primary">legal@ratioai.app</span>.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Terms;
