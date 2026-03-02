import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Finally, a nutrition app that doesn't make me type everything. Just snap and go!",
    name: "Sarah M.",
    role: "Beta Tester",
    initials: "SM",
  },
  {
    quote: "I've tried every calorie tracker out there. RatioAi is the first one I actually stuck with.",
    name: "Priya R.",
    role: "Early Access User",
    initials: "PR",
  },
];

const Testimonials = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="z-10 w-full max-w-sm mb-10"
    >
      <div className="flex items-center gap-2 mb-4">
        <Quote className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Early feedback
        </span>
      </div>

      <div className="space-y-3">
        {testimonials.map((t, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.12 }}
            className="p-4 rounded-xl bg-card/60 border border-border/50"
          >
            <p className="text-xs text-foreground/90 leading-relaxed italic mb-3">
              "{t.quote}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary">{t.initials}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Testimonials;
