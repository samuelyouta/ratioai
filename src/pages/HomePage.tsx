import { motion } from "framer-motion";
import { Bell, Plus, ChevronRight, MapPin } from "lucide-react";
import ProgressRing from "@/components/ProgressRing";
import MacroBar from "@/components/MacroBar";
import MealCard from "@/components/MealCard";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();
  const caloriesEaten = 1420;
  const caloriesTarget = 2150;
  const remaining = caloriesTarget - caloriesEaten;
  const pct = Math.round((caloriesEaten / caloriesTarget) * 100);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Good afternoon</p>
          <h1 className="text-xl font-bold text-foreground">Alex 👋</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Predictive suggestion */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full"
          >
            <MapPin className="w-3 h-3" /> Near Starbucks?
          </motion.button>
          <button className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Calorie ring */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center py-6"
      >
        <ProgressRing progress={pct} size={160} strokeWidth={10}>
          <div className="text-center">
            <p className="text-3xl font-black text-foreground">{remaining}</p>
            <p className="text-xs text-muted-foreground">remaining</p>
          </div>
        </ProgressRing>

        <div className="flex items-center gap-6 mt-4 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{caloriesEaten}</p>
            <p className="text-[11px] text-muted-foreground">eaten</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold text-foreground">{caloriesTarget}</p>
            <p className="text-[11px] text-muted-foreground">target</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold text-foreground">320</p>
            <p className="text-[11px] text-muted-foreground">burned</p>
          </div>
        </div>
      </motion.div>

      {/* Macros */}
      <div className="px-6 mb-6">
        <div className="flex gap-4">
          <MacroBar label="Protein" current={98} target={161} color="primary" />
          <MacroBar label="Carbs" current={145} target={215} color="coral" />
          <MacroBar label="Fat" current={52} target={72} color="info" />
        </div>
      </div>

      {/* Daily streak / gamification */}
      <div className="px-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="gradient-glow rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-sm font-bold text-primary-foreground">12-day streak!</p>
              <p className="text-xs text-primary-foreground/70">Keep going, you're on fire</p>
            </div>
          </div>
          <div className="flex -space-x-1">
            {["🟢","🟢","🟢","🟢","🟡","⚪","⚪"].map((d, i) => (
              <span key={i} className="text-sm">{d}</span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bio feedback teaser */}
      <div className="px-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
        >
          <span className="text-xl">📊</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Your lunch caused a mild glucose spike</p>
            <p className="text-xs text-muted-foreground">40% lower than last Tuesday — nice!</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </div>

      {/* Meals */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Today's Meals</h3>
          <button
            onClick={() => navigate("/camera")}
            className="flex items-center gap-1 text-xs text-primary font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Log
          </button>
        </div>
        <div className="space-y-3">
          <MealCard
            time="8:30 AM"
            title="Breakfast"
            calories={520}
            items={["Oatmeal", "Banana", "Almond Butter", "Honey"]}
            icon="🌅"
          />
          <MealCard
            time="12:45 PM"
            title="Lunch"
            calories={680}
            items={["Grilled Chicken", "Brown Rice", "Broccoli", "+1 tbsp oil (AI detected)"]}
            icon="☀️"
          />
          <MealCard
            time="3:15 PM"
            title="Snack"
            calories={220}
            items={["Greek Yogurt", "Blueberries"]}
            icon="🍎"
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HomePage;
