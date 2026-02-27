import { Check, Minus, Plus } from "lucide-react";
import { useState } from "react";

interface FoodItemProps {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  onEdit?: () => void;
}

const FoodItem = ({ name, portion, calories, protein, carbs, fat, confidence }: FoodItemProps) => {
  const [qty, setQty] = useState(1);

  return (
    <div className="gradient-card rounded-2xl p-4 border border-border space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">{name}</h4>
            {confidence >= 90 && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                <Check className="w-2.5 h-2.5" /> USDA
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{portion} · {confidence}% match</p>
        </div>
        <span className="text-lg font-bold text-foreground">{calories * qty}<span className="text-xs text-muted-foreground font-normal ml-0.5">cal</span></span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>P <span className="text-foreground font-medium">{protein * qty}g</span></span>
          <span>C <span className="text-foreground font-medium">{carbs * qty}g</span></span>
          <span>F <span className="text-foreground font-medium">{fat * qty}g</span></span>
        </div>
        <div className="flex items-center gap-3 bg-secondary rounded-full px-1 py-0.5">
          <button onClick={() => setQty(Math.max(0.5, qty - 0.5))} className="p-1 text-muted-foreground hover:text-foreground">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[2ch] text-center">{qty}</span>
          <button onClick={() => setQty(qty + 0.5)} className="p-1 text-muted-foreground hover:text-foreground">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FoodItem;
