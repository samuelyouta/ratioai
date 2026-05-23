import { useEffect, useRef, useCallback } from "react";

interface NumberDialProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  /** Pixel width allocated to each number cell. Active number sits centered. */
  itemWidth?: number;
  unitLabel?: string;
}

/**
 * Apple Watch crown / camera lens dial style number picker.
 * - Horizontal scroll-snap track
 * - Center item is the "selected" value
 * - Opacity gradient mask fades the edges
 * - Active number scales up + glows; neighbors dim out
 */
const NumberDial = ({
  value,
  min,
  max,
  onChange,
  itemWidth = 56,
  unitLabel,
}: NumberDialProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const isSyncingExternal = useRef(false);

  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const scrollToValue = useCallback(
    (v: number, behavior: ScrollBehavior = "smooth") => {
      const el = trackRef.current;
      if (!el) return;
      const idx = v - min;
      const targetScroll = idx * itemWidth;
      isSyncingExternal.current = true;
      el.scrollTo({ left: targetScroll, behavior });
      // release lock after animation settles
      window.setTimeout(() => {
        isSyncingExternal.current = false;
      }, behavior === "smooth" ? 500 : 50);
    },
    [min, itemWidth],
  );

  // Initial position + sync when value changes externally
  useEffect(() => {
    scrollToValue(value, "auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const currentIdx = Math.round(el.scrollLeft / itemWidth) + min;
    if (currentIdx !== value) scrollToValue(value, "smooth");
  }, [value, min, itemWidth, scrollToValue]);

  // Track scroll → derive active value live, then snap on settle
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let scrollTimer: number | null = null;

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const center = el.scrollLeft + el.clientWidth / 2;
        const trackPadding = (el.clientWidth - itemWidth) / 2;
        const idx = Math.round((center - trackPadding - itemWidth / 2) / itemWidth);
        const next = Math.max(min, Math.min(max, min + idx));
        if (!isSyncingExternal.current && next !== value) {
          onChange(next);
        }
      });
      if (scrollTimer) window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        // No explicit snap needed — scroll-snap-type handles it
      }, 80);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scrollTimer) window.clearTimeout(scrollTimer);
    };
  }, [value, min, max, itemWidth, onChange]);

  return (
    <div className="relative w-full">
      {/* Large active value display */}
      <div className="text-center mb-2">
        <span
          className="text-7xl font-black tabular-nums text-primary tracking-tight"
          style={{ textShadow: "0 0 28px hsl(var(--primary) / 0.5)" }}
        >
          {value}
        </span>
        {unitLabel && (
          <span className="text-base font-semibold text-muted-foreground ml-2">{unitLabel}</span>
        )}
      </div>

      {/* Center caret */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[88px] z-10">
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
      </div>

      {/* Dial track with gradient opacity mask */}
      <div
        ref={trackRef}
        className="overflow-x-scroll no-scrollbar"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)",
          paddingLeft: "calc(50% - " + itemWidth / 2 + "px)",
          paddingRight: "calc(50% - " + itemWidth / 2 + "px)",
        }}
      >
        <div className="flex items-end h-16 pt-2">
          {numbers.map((n) => {
            const dist = Math.abs(n - value);
            const isActive = n === value;
            const opacity = isActive ? 1 : Math.max(0.25, 1 - dist * 0.25);
            const scale = isActive ? 1 : Math.max(0.7, 1 - dist * 0.08);
            return (
              <button
                key={n}
                ref={(el) => {
                  if (el) itemRefs.current.set(n, el);
                  else itemRefs.current.delete(n);
                }}
                onClick={() => onChange(n)}
                className="flex flex-col items-center justify-end shrink-0 select-none focus:outline-none"
                style={{
                  width: itemWidth,
                  scrollSnapAlign: "center",
                  scrollSnapStop: "always",
                }}
              >
                <span
                  className={`tabular-nums font-semibold transition-colors ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}
                  style={{
                    opacity,
                    transform: `scale(${scale})`,
                    fontSize: isActive ? 22 : 18,
                    lineHeight: 1,
                  }}
                >
                  {n}
                </span>
                <span
                  className="mt-2 rounded-full"
                  style={{
                    width: 2,
                    height: isActive ? 16 : n % 5 === 0 ? 12 : 6,
                    background: isActive
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted-foreground) / 0.4)",
                    boxShadow: isActive ? "0 0 8px hsl(var(--primary))" : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NumberDial;
