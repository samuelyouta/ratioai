import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight, Flame, Dumbbell, Scale, Zap } from "lucide-react";

const goals = [
  { id: "lose", icon: Flame, label: "Lose Fat", desc: "Caloric deficit with smart tracking", color: "text-coral" },
  { id: "muscle", icon: Dumbbell, label: "Build Muscle", desc: "High protein, structured surplus", color: "text-primary" },
  { id: "maintain", icon: Scale, label: "Maintain", desc: "Keep your current physique", color: "text-info" },
  { id: "endurance", icon: Zap, label: "Endurance", desc: "Fuel for long-distance performance", color: "text-warning" },
];

const GoalSelection = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <OnboardingLayout step={0} totalSteps={4}>
      <div className="mt-8 mb-6">
        <h2 className="text-2xl font-bold text-foreground">What's your goal?</h2>
        <p className="text-muted-foreground mt-1 text-sm">We'll personalize everything around this.</p>
      </div>

      <div className="space-y-3 flex-1">
        {goals.map(({ id, icon: Icon, label, desc, color }, i) => (
          <motion.button
            key={id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => setSelected(id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
              selected === id
                ? "border-primary bg-primary/5 shadow-glow-sm"
                : "border-border bg-card hover:border-muted-foreground/30"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-secondary ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{label}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <button
        disabled={!selected}
        onClick={() => navigate("/profile-setup")}
        className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center mt-6 disabled:opacity-40 disabled:shadow-none transition-opacity"
      >
        Continue <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default GoalSelection;
