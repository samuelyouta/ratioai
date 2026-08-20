import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Trash2, Pencil, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMeals, deleteMeal, updateMeal, type Meal, type MealSource } from "@/lib/profile";
import { toast } from "sonner";

type Filter = "all" | MealSource | "verified";

const sourceLabel: Record<MealSource, string> = {
  photo: "Photo",
  voice: "Voice",
  manual: "Manual",
};

const formatDay = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const History = () => {
  const navigate = useNavigate();
  const [meals, setMeals] = useState<Meal[]>(() =>
    [...getMeals()].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)),
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Meal | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meals.filter((m) => {
      if (filter === "verified" && !m.verified) return false;
      if (filter !== "all" && filter !== "verified" && (m.source ?? "photo") !== filter) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.items.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [meals, query, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Meal[]> = {};
    for (const m of filtered) {
      const key = formatDay(m.loggedAt);
      (groups[key] ??= []).push(m);
    }
    return Object.entries(groups);
  }, [filtered]);

  const handleDelete = (m: Meal) => {
    deleteMeal(m.id);
    setMeals((prev) => prev.filter((x) => x.id !== m.id));
    toast.success("Meal deleted");
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    updateMeal(editing.id, {
      title: editing.title,
      items: editing.items,
      verified: true,
      notes: editing.notes,
    });
    setMeals(
      [...getMeals()].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)),
    );
    setEditing(null);
    toast.success("Meal updated");
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "photo", label: "Photo" },
    { id: "voice", label: "Voice" },
    { id: "manual", label: "Manual" },
    { id: "verified", label: "Verified" },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 safe-top pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Meal history</h1>
          <p className="text-xs text-muted-foreground">{meals.length} entries logged</p>
        </div>
      </div>

      <div className="px-6 mb-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meals or ingredients"
            className="pl-9 bg-card border-border"
          />
        </div>
      </div>

      <div className="px-6 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              filter === f.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-6 space-y-6">
        {grouped.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No meals match your search.
          </div>
        )}

        {grouped.map(([day, items]) => (
          <div key={day}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {day}
            </h2>
            <div className="space-y-2">
              {items.map((m) => {
                const src = (m.source ?? "photo") as MealSource;
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate(`/app/history/${m.id}`)}
                    className="gradient-card rounded-2xl p-3 border border-border flex gap-3 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    {m.imageDataUrl && (
                      <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                        <img src={m.imageDataUrl} alt={m.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {m.title}
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            {formatTime(m.loggedAt)} · {m.items.length} item
                            {m.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-primary whitespace-nowrap">
                          {m.totalCalories} <span className="text-[10px] text-muted-foreground">cal</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                          {sourceLabel[src]}
                        </span>
                        {m.verified && (
                          <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">
                            Verified
                          </span>
                        )}
                        <div className="ml-auto flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(m);
                            }}
                            className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                            aria-label="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(m);
                            }}
                            className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-destructive"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card border border-border rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Edit meal</h3>
                <button
                  onClick={() => setEditing(null)}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <label className="text-xs text-muted-foreground">Title</label>
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="mt-1 mb-4 bg-background border-border"
              />

              <p className="text-xs text-muted-foreground mb-2">Items</p>
              <div className="space-y-2 mb-4">
                {editing.items.map((it, idx) => (
                  <div key={idx} className="bg-background border border-border rounded-xl p-3">
                    <Input
                      value={it.name}
                      onChange={(e) => {
                        const items = [...editing.items];
                        items[idx] = { ...it, name: e.target.value };
                        setEditing({ ...editing, items });
                      }}
                      placeholder="Name"
                      className="bg-card border-border mb-2"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
                        <div key={k}>
                          <label className="text-[10px] text-muted-foreground uppercase">{k}</label>
                          <Input
                            type="number"
                            value={it[k]}
                            onChange={(e) => {
                              const items = [...editing.items];
                              items[idx] = { ...it, [k]: Number(e.target.value) || 0 };
                              setEditing({ ...editing, items });
                            }}
                            className="bg-card border-border h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const items = editing.items.filter((_, i) => i !== idx);
                        setEditing({ ...editing, items });
                      }}
                      className="text-[11px] text-destructive mt-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {editing.items.length === 0 && (
                  <p className="text-xs text-muted-foreground">No items yet.</p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setEditing({
                    ...editing,
                    items: [
                      ...editing.items,
                      { name: "New item", portion: "1 serving", calories: 0, protein: 0, carbs: 0, fat: 0 },
                    ],
                  })
                }
                className="w-full mb-4"
              >
                + Add item
              </Button>

              <Button onClick={handleSaveEdit} className="w-full gradient-glow text-primary-foreground font-semibold">
                Save changes
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default History;
