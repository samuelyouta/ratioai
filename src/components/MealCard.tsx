import { motion } from "framer-motion";

interface MealCardProps {
  time: string;
  title: string;
  calories: number;
  items: string[];
  /** Kept for backwards compatibility; no longer rendered. */
  icon?: string;
}

const MealCard = ({ time, title, calories, items }: MealCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="gradient-card rounded-2xl p-4 border border-border"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h4 className="font-semibold text-foreground text-sm truncate">{title}</h4>
          <p className="text-xs text-muted-foreground">{time}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-bold text-primary">{calories}</span>
          <span className="text-xs text-muted-foreground ml-0.5">cal</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="text-[11px] bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full"
          >
            {item}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

export default MealCard;
