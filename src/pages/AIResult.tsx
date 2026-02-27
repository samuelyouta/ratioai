import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, AlertTriangle, Check, Sparkles } from "lucide-react";
import FoodItem from "@/components/FoodItem";
import { useState } from "react";

const AIResult = () => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  const totalCalories = 685;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => navigate("/home"), 1800);
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 gradient-glow rounded-full mx-auto flex items-center justify-center shadow-glow mb-6"
          >
            <Check className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Meal Logged! 🎉</h2>
          <p className="text-muted-foreground text-sm mb-1">{totalCalories} calories added to your day</p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-primary text-sm font-medium mt-4"
          >
            🔥 Nice choice! This meal is protein-rich.
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <button onClick={() => navigate("/camera")} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="font-semibold text-foreground">AI Analysis</h2>
        <div className="w-10" />
      </div>

      {/* AI status */}
      <div className="px-6 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-primary/10 rounded-xl px-4 py-2.5"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm text-primary font-medium">3 items detected · USDA verified</p>
        </motion.div>
      </div>

      {/* X-Ray probe alert */}
      <div className="px-6 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-start gap-3 bg-warning/10 rounded-xl px-4 py-3 border border-warning/20"
        >
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Hidden ingredient detected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This looks like restaurant chicken — should I add ~1 tbsp cooking oil (+120 cal)?
            </p>
            <div className="flex gap-2 mt-2">
              <button className="text-xs font-medium text-primary-foreground bg-primary px-3 py-1 rounded-lg">Yes, add it</button>
              <button className="text-xs font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-lg">No thanks</button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Food items */}
      <div className="px-6 space-y-3 mb-6">
        <FoodItem name="Grilled Chicken Breast" portion="150g (1 piece)" calories={248} protein={46} carbs={0} fat={5} confidence={96} />
        <FoodItem name="Brown Rice" portion="200g (1 cup)" calories={216} protein={5} carbs={45} fat={2} confidence={92} />
        <FoodItem name="Steamed Broccoli" portion="100g" calories={55} protein={4} carbs={11} fat={1} confidence={94} />
      </div>

      {/* Add missing / search */}
      <div className="px-6 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/manual-edit")}
            className="flex-1 flex items-center justify-center gap-2 bg-card border border-border rounded-xl py-3 text-sm font-medium text-foreground"
          >
            <Search className="w-4 h-4" /> Search & Edit
          </button>
          <button className="flex items-center justify-center gap-2 bg-card border border-border rounded-xl py-3 px-4 text-sm font-medium text-foreground">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Total + Confirm */}
      <div className="px-6">
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total meal</span>
            <span className="text-xl font-bold text-foreground">{totalCalories} <span className="text-sm text-muted-foreground font-normal">cal</span></span>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Protein <span className="text-foreground font-medium">55g</span></span>
            <span>Carbs <span className="text-foreground font-medium">56g</span></span>
            <span>Fat <span className="text-foreground font-medium">8g</span></span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          className="gradient-glow text-primary-foreground font-semibold text-base py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center"
        >
          <Check className="w-5 h-5" /> Confirm & Log Meal
        </motion.button>
      </div>
    </div>
  );
};

export default AIResult;
