import { motion } from "framer-motion";

/**
 * Animated flame shown briefly when the user logs the first meal of the day.
 * Renders inline above the streak chip on Today.
 */
const FlameBurst = () => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 10 }}
      animate={{ scale: [0, 1.3, 1], opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative inline-flex"
    >
      <motion.span
        animate={{ scale: [1, 1.15, 1], rotate: [-3, 3, -3] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="text-3xl drop-shadow-[0_0_12px_rgba(255,140,0,0.7)]"
      >
        🔥
      </motion.span>
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-coral"
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((i / 6) * Math.PI * 2) * 30,
            y: Math.sin((i / 6) * Math.PI * 2) * 30 - 10,
            opacity: 0,
            scale: 0.4,
          }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
        />
      ))}
    </motion.div>
  );
};

export default FlameBurst;
