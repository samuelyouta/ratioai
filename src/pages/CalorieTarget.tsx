import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import OnboardingLayout from "@/components/OnboardingLayout";
import ProgressRing from "@/components/ProgressRing";
import { ArrowRight, Pencil } from "lucide-react";

const CalorieTarget = () => {
  const navigate = useNavigate();
  const [calories, setCalories] = useState(2150);
  const [editing, setEditing] = useState(false);

  const macros = {
    protein: Math.round(calories * 0.3 / 4),
    carbs: Math.round(calories * 0.4 / 4),
    fat: Math.round(calories * 0.3 / 9),
  };

  return (
    <OnboardingLayout step={2} totalSteps={4}>
      <div className="mt-8 mb-6">
        <h2 className="text-2xl font-bold text-foreground">Your daily target</h2>
        <p className="text-muted-foreground mt-1 text-sm">Based on your profile. You can adjust anytime.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center py-8"
      >
        <ProgressRing progress={100} size={180} strokeWidth={10}>
          <div className="text-center">
            {editing ? (
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                onBlur={() => setEditing(false)}
                autoFocus
                className="w-20 text-center text-3xl font-black text-foreground bg-transparent border-b-2 border-primary outline-none"
              />
            ) : (
              <button onClick={() => setEditing(true)} className="group">
                <span className="text-3xl font-black text-foreground">{calories}</span>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground inline ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">calories / day</p>
          </div>
        </ProgressRing>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-3 gap-3 mb-8"
      >
        {[
          { label: "Protein", value: macros.protein, unit: "g", color: "gradient-glow" },
          { label: "Carbs", value: macros.carbs, unit: "g", color: "gradient-coral" },
          { label: "Fat", value: macros.fat, unit: "g", color: "bg-info" },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-3 text-center">
            <div className={`w-2 h-2 rounded-full ${color} mx-auto mb-2`} />
            <p className="text-lg font-bold text-foreground">{value}<span className="text-xs text-muted-foreground">{unit}</span></p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* X-Ray Probe & Safe Mode chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-2 mb-6"
      >
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
          <span className="text-lg">🔬</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">X-Ray Ingredient Probe</p>
            <p className="text-xs text-muted-foreground">AI detects hidden oils & dressings</p>
          </div>
          <div className="w-9 h-5 bg-primary rounded-full relative">
            <div className="w-4 h-4 bg-primary-foreground rounded-full absolute right-0.5 top-0.5" />
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
          <span className="text-lg">💚</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Safe Mode</p>
            <p className="text-xs text-muted-foreground">Hides numbers, uses fuel gauge instead</p>
          </div>
          <div className="w-9 h-5 bg-muted rounded-full relative">
            <div className="w-4 h-4 bg-muted-foreground/50 rounded-full absolute left-0.5 top-0.5" />
          </div>
        </div>
      </motion.div>

      <div className="mt-auto">
        <button
          onClick={() => navigate("/home")}
          className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center"
        >
          Let's Go <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </OnboardingLayout>
  );
};

export default CalorieTarget;
