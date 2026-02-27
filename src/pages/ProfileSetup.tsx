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

type Unit = "metric" | "imperial";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [gender, setGender] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>("metric");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [activity, setActivity] = useState<string | null>(null);
  const [days, setDays] = useState(4);

  const genders = [
    { id: "male", label: "Male", icon: "♂️" },
    { id: "female", label: "Female", icon: "♀️" },
    { id: "other", label: "Other", icon: "⚧️" },
  ];

  const isValid = gender && height && weight && age && activity;

  return (
    <OnboardingLayout step={1} totalSteps={4}>
      <div className="mt-6 mb-5">
        <h2 className="text-2xl font-bold text-foreground">About you</h2>
        <p className="text-muted-foreground mt-1 text-sm">We need this to calculate your ideal daily intake.</p>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pb-4">
        {/* Gender */}
        <div>
          <h3 className="font-semibold text-foreground text-sm mb-2.5">Gender</h3>
          <div className="flex gap-2">
            {genders.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setGender(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                  gender === id
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Age */}
        <div>
          <h3 className="font-semibold text-foreground text-sm mb-2.5">Age</h3>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="25"
            className="w-full bg-card border border-border rounded-xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Unit toggle + Height & Weight */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-semibold text-foreground text-sm">Height & Weight</h3>
            <div className="flex bg-secondary rounded-lg p-0.5">
              {(["metric", "imperial"] as Unit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`text-xs font-medium px-3 py-1 rounded-md transition-all ${
                    unit === u
                      ? "gradient-glow text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {u === "metric" ? "kg / cm" : "lbs / ft"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder={unit === "metric" ? "175" : "5.9"}
                className="w-full bg-card border border-border rounded-xl py-3 px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {unit === "metric" ? "cm" : "ft"}
              </span>
            </div>
            <div className="flex-1 relative">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={unit === "metric" ? "75" : "165"}
                className="w-full bg-card border border-border rounded-xl py-3 px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {unit === "metric" ? "kg" : "lbs"}
              </span>
            </div>
          </div>
        </div>

        {/* Activity level */}
        <div>
          <h3 className="font-semibold text-foreground text-sm mb-2.5">Activity level</h3>
          <div className="space-y-2">
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
        </div>

        {/* Training days */}
        <div>
          <h3 className="font-semibold text-foreground text-sm mb-2.5">Training days per week</h3>
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
      </div>

      <div className="pt-4">
        <button
          disabled={!isValid}
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
