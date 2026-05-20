import { useEffect, useRef, useState } from "react";

interface ScaleSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** Renders the big label above the slider; receives current value */
  renderLabel: (v: number) => React.ReactNode;
}

/**
 * Premium horizontal scale slider with tick marks. The big label above is
 * controlled by the parent so it can format (e.g. ft+in) the value.
 */
const ScaleSlider = ({ value, min, max, step = 1, onChange, renderLabel }: ScaleSliderProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const raw = min + x * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChange(Math.max(min, Math.min(max, snapped)));
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setFromClientX(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  // Render ~21 ticks centered on current value for a "ruler" feel
  const tickCount = 21;
  const ticks = Array.from({ length: tickCount }, (_, i) => i - Math.floor(tickCount / 2));

  return (
    <div className="select-none">
      <div className="text-center mb-6 transition-transform" style={{ transform: dragging ? "scale(1.04)" : "scale(1)" }}>
        {renderLabel(value)}
      </div>

      <div
        ref={trackRef}
        onPointerDown={(e) => {
          setDragging(true);
          setFromClientX(e.clientX);
        }}
        className="relative h-20 touch-none cursor-grab active:cursor-grabbing"
      >
        {/* Ruler ticks */}
        <div className="absolute inset-x-0 top-0 h-10 flex items-end justify-between">
          {ticks.map((offset) => {
            const tickVal = value + offset * step;
            const isMajor = offset % 5 === 0;
            const inRange = tickVal >= min && tickVal <= max;
            return (
              <div
                key={offset}
                className={`w-px rounded-full transition-colors ${
                  offset === 0 ? "bg-primary" : inRange ? "bg-muted-foreground/40" : "bg-muted-foreground/10"
                }`}
                style={{ height: isMajor ? 28 : 14 }}
              />
            );
          })}
        </div>

        {/* Center indicator caret */}
        <div className="absolute left-1/2 -translate-x-1/2 top-10">
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
        </div>

        {/* Track */}
        <div className="absolute inset-x-0 bottom-3 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full gradient-glow"
            style={{ width: `${pct}%`, boxShadow: "0 0 12px hsl(var(--primary) / 0.6)" }}
          />
        </div>
      </div>
    </div>
  );
};

export default ScaleSlider;
