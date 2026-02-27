interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: "primary" | "coral" | "info" | "warning";
  unit?: string;
}

const colorMap = {
  primary: "gradient-glow",
  coral: "gradient-coral",
  info: "bg-info",
  warning: "bg-warning",
};

const MacroBar = ({ label, current, target, color, unit = "g" }: MacroBarProps) => {
  const pct = Math.min((current / target) * 100, 100);

  return (
    <div className="flex-1 space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">
          {current}<span className="text-muted-foreground font-normal">/{target}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colorMap[color]} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default MacroBar;
