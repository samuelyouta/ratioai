import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-sm font-semibold">Privacy Policy</h1>
      </div>

      <main className="flex-1 px-5 py-8 max-w-xl mx-auto w-full space-y-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Privacy Policy</h2>
            <p className="text-xs text-muted-foreground">Last updated: October 2026</p>
          </div>
        </div>

        <MedicalDisclaimer />

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">1. Information We Collect</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            RatioAi collects the following categories of data when you use the app:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li>
              <span className="text-foreground font-medium">Photos</span> — meal photos you take or
              choose for AI nutrition analysis.
            </li>
            <li>
              <span className="text-foreground font-medium">Body metrics / health-related fitness data</span>{" "}
              — height, weight, age, gender, activity level, and nutrition goals you enter during
              onboarding (used to estimate calorie and macro targets).
            </li>
            <li>
              <span className="text-foreground font-medium">Glucose / health-adjacent data</span> — RatioAi
              does <span className="text-foreground font-medium">not</span> integrate with CGMs and does
              not currently collect continuous glucose monitor readings. If you type free-text notes that
              mention glucose or similar health topics, that text is treated as user content and as
              health-related information under this policy. RatioAi is not a medical device.
            </li>
            <li>
              <span className="text-foreground font-medium">Purchase history</span> — App Store / RevenueCat
              subscription status and purchase history needed to unlock Pro features (we do not store your
              full payment card number).
            </li>
            <li>
              <span className="text-foreground font-medium">Contact info</span> — name (if provided) and
              email address for account sign-in and support.
            </li>
            <li>
              <span className="text-foreground font-medium">Usage data</span> — meal logs (nutrition
              metadata), streaks, and basic app session diagnostics needed to operate the service.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">2. How We Use Your Data</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use your data to personalize nutrition targets, analyze meals with AI, sync your history
            across devices, manage subscriptions, and provide support. We do not sell your personal data.
            We never share your meals, photos, body metrics, or other health-related data with
            advertising partners.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">3. Photos &amp; AI Processing</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you scan a meal, the photo is sent to our meal-analysis backend (hosted on Vercel) and
            processed by OpenAI vision models to estimate foods and macros. Photos may be held briefly for
            analysis. Cloud meal sync stores nutrition metadata; meal photo binaries are kept on-device and
            are not uploaded as permanent cloud meal history. You can delete meals and your account at any
            time from Profile.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">4. Third-Party Services</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We share data with service providers only as needed to run RatioAi:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li>
              <span className="text-foreground font-medium">OpenAI</span> — meal photo / description
              analysis.
            </li>
            <li>
              <span className="text-foreground font-medium">Supabase</span> — authentication and cloud
              storage for profiles and meal metadata.
            </li>
            <li>
              <span className="text-foreground font-medium">RevenueCat &amp; Apple</span> — in-app
              purchases and subscription status (purchase history).
            </li>
            <li>
              <span className="text-foreground font-medium">Meta (Facebook &amp; Instagram)</span> —
              third-party advertising and attribution. Our app uses the Meta SDK so Meta can tell which
              of our ads led to an install, sign-up, or subscription, and can show our ads to people
              likely to be interested. See “Tracking” below.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">5. Tracking</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use third-party advertising and attribution services, currently Meta (Facebook and
            Instagram), to promote RatioAi and measure how well our ads work. For this, the app
            includes the Meta SDK, which sends Meta basic app events: that the app was opened, that an
            account was created, that onboarding was completed, that checkout was started, and
            that a subscription was purchased (with its price). These events are linked to a device
            identifier. If you allow tracking when iOS asks, Meta can match them to your
            Meta account using your device’s advertising identifier (IDFA); if you decline, only
            aggregated, privacy-preserving attribution is used and your advertising identifier is not
            collected. Meta processes this data under its own privacy policy
            (<span className="text-primary">facebook.com/privacy/policy</span>). Declining tracking does
            not limit any app feature.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We never send Meta your meals, photos, body metrics, goals, name, or email. You can change
            your choice at any time in iOS Settings → Privacy &amp; Security → Tracking → RatioAi, and
            you can manage ad preferences in your Meta account settings.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">6. Your Rights &amp; Deletion</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You may access, update, or delete your personal data. Use Profile → Delete Account to remove
            your auth account and associated cloud data, or email{" "}
            <span className="text-primary">privacy@ratioai.app</span>.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">7. Children’s Privacy</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            RatioAi is not intended for children under 13. We do not knowingly collect data from children
            under 13.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">8. Contact</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Privacy questions: <span className="text-primary">privacy@ratioai.app</span>
          </p>
        </section>
      </main>
    </div>
  );
};

export default Privacy;
