import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-sm font-semibold">Privacy Policy</h1>
      </div>

      <main className="flex-1 px-5 py-8 max-w-xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Privacy Policy</h2>
            <p className="text-xs text-muted-foreground">Last updated: May 2026</p>
          </div>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">1. Information We Collect</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We collect the information you provide directly, such as your email address, age, gender, body metrics, activity level, and nutrition goals. We also collect photos of meals you log for AI analysis.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">2. How We Use Your Data</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your data is used to personalize your nutrition insights, calculate calorie and macro targets, and improve our AI models. We never sell your personal data to third parties.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">3. Data Storage & Security</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All data is stored securely using industry-standard encryption. Meal photos are processed by AI and may be temporarily cached for analysis. You can delete your account and all associated data at any time from your Profile settings.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">4. Third-Party Services</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use AI services to analyze food photos. These services receive only the image data necessary for analysis and do not retain your images permanently.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">5. Your Rights</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You have the right to access, update, or delete your personal data at any time. Contact us at <span className="text-primary">privacy@ratioai.app</span> for data requests.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">6. Children's Privacy</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            RatioAi is not intended for children under 13. We do not knowingly collect data from children under 13.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Privacy;
