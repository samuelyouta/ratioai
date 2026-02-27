import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus } from "lucide-react";
import { motion } from "framer-motion";

const popularFoods = [
  { name: "Chicken Breast", cal: 165, per: "100g" },
  { name: "White Rice", cal: 130, per: "100g" },
  { name: "Egg (Large)", cal: 72, per: "1 egg" },
  { name: "Banana", cal: 89, per: "1 medium" },
  { name: "Avocado", cal: 160, per: "½ fruit" },
  { name: "Greek Yogurt", cal: 100, per: "170g" },
  { name: "Salmon Fillet", cal: 208, per: "100g" },
  { name: "Sweet Potato", cal: 86, per: "100g" },
];

const recentFoods = [
  { name: "Oatmeal w/ Honey", cal: 210, per: "1 bowl" },
  { name: "Almond Butter", cal: 98, per: "1 tbsp" },
  { name: "Blueberries", cal: 57, per: "100g" },
];

const ManualEdit = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = query
    ? popularFoods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search food or scan barcode..."
            autoFocus
            className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {query ? (
        <div className="px-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Results</h3>
          <div className="space-y-2">
            {filtered.map((food, i) => (
              <motion.button
                key={food.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="w-full flex items-center justify-between bg-card border border-border rounded-xl p-3 text-left hover:border-primary/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{food.name}</p>
                  <p className="text-xs text-muted-foreground">{food.per}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">{food.cal} cal</span>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </motion.button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No results found. Try a different search.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6">
          {/* Recent */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recent</h3>
            <div className="space-y-2">
              {recentFoods.map((food) => (
                <button
                  key={food.name}
                  className="w-full flex items-center justify-between bg-card border border-border rounded-xl p-3 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{food.name}</p>
                    <p className="text-xs text-muted-foreground">{food.per}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{food.cal} cal</span>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Popular */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Popular Foods</h3>
            <div className="space-y-2">
              {popularFoods.map((food) => (
                <button
                  key={food.name}
                  className="w-full flex items-center justify-between bg-card border border-border rounded-xl p-3 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{food.name}</p>
                    <p className="text-xs text-muted-foreground">{food.per}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{food.cal} cal</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualEdit;
