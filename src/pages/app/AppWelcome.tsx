import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import logo from "@/assets/logo.jpg";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import LanguagePicker from "@/components/LanguagePicker";
import { useT } from "@/i18n";


const AppWelcome = () => {
  const navigate = useNavigate();
  const { t } = useT();

  const tags = [
    `📸 ${t("app.tag.photo")}`,
    `🔬 ${t("app.tag.hidden")}`,
    `📊 ${t("app.tag.trends")}`,
    `🎯 ${t("app.tag.macros")}`,
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-0 right-4 z-20 safe-top-sm">
        <LanguagePicker variant="pill" />
      </div>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center text-center z-10"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-3xl overflow-hidden shadow-glow mb-8"
        >
          <img src={logo} alt="RatioAi logo" className="w-full h-full object-cover" />
        </motion.div>

        <h1 className="text-4xl font-black text-foreground tracking-tight mb-3">RatioAi</h1>
        <p className="text-muted-foreground text-base max-w-xs leading-relaxed mb-8">
          {t("app.tagline")}
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-xs">
          {tags.map((tag) => (
            <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/app/onboarding/goal")}
          className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full max-w-xs justify-center"
        >
          {t("welcome.getStarted")} <ArrowRight className="w-5 h-5" />
        </motion.button>

        <button
          type="button"
          onClick={() => navigate("/app/signin")}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("welcome.haveAccount")}
        </button>


        

        <MedicalDisclaimer compact className="mt-6 max-w-xs text-center" />

        <div className="flex items-center justify-center gap-2 mt-3">
          <a href="/privacy" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
            {t("common.privacy")}
          </a>
          <span className="text-muted-foreground/30 text-[11px]">·</span>
          <a href="/terms" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
            {t("common.terms")}
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default AppWelcome;
