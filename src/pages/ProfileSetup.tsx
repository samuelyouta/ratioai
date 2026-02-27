import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";

const activityLevels = [
  { id: "sedentary", label: "Sedentary", desc: "Desk job, little exercise" },
  { id: "light", label: "Lightly Active", desc: "Light exercise 1-3 days" },
  { id: "moderate", label: "Moderately Active", desc: "Exercise 3-5 days" },
  { id: "very", label: "Very Active", desc: "Hard exercise 6-7 days" },
];

const trainingDays = [1, 2, 3, 4, 5, 6, 7];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<string | null>(null);
  const [days, setDays] = useState(4);

  return (
    <OnboardingLayout step={1} totalSteps={4}>
      <div className="mt-8 mb-6">
        <h2 className="text-2xl font-bold text-foreground">Your activity</h2>
        <p className="text-muted-foreground mt-1 text-sm">Helps us calculate your ideal intake.</p>
      </div>

      <div className="space-y-2 mb-8">
        {activityLevels.map(({ id, label, desc }, i) => (
          <motion.button
            key={id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => setActivity(id)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
              activity === id
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            <div>
              <h3 className="font-medium text-foreground text-sm">{label}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mb-8">
        <h3 className="font-semibold text-foreground mb-3">Training days per week</h3>
        <div className="flex gap-2">
          {trainingDays.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                days === d
                  ? "gradient-glow text-primary-foreground shadow-glow-sm"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <button
          disabled={!activity}
          onClick={() => navigate("/calorie-target")}
          className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center disabled:opacity-40 disabled:shadow-none transition-opacity"
        >
          Continue <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </OnboardingLayout>
  );
};

export default ProfileSetup;
