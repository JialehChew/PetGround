import { motion } from "framer-motion";

/** Floating paw / bone / heart accents for the home hero (decorative only). */
export default function HeroDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
      <motion.span
        className="absolute left-[6%] top-[12%] text-3xl opacity-35 select-none"
        animate={{ y: [0, -6, 0], rotate: [-8, -4, -8] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        🐾
      </motion.span>
      <motion.span
        className="absolute right-[10%] top-[20%] text-2xl opacity-30 select-none"
        animate={{ y: [0, 8, 0], rotate: [12, 18, 12] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      >
        🦴
      </motion.span>
      <motion.span
        className="absolute right-[18%] bottom-[18%] text-2xl opacity-35 text-[#F9C74F] select-none"
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      >
        ♡
      </motion.span>
      <motion.span
        className="absolute left-[12%] bottom-[22%] text-xl opacity-25 select-none"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        🐾
      </motion.span>
      <svg
        className="absolute right-[4%] top-[40%] h-10 w-10 text-[#FFE8A3]/80"
        viewBox="0 0 32 32"
        fill="currentColor"
        aria-hidden
      >
        <path d="M16 26c-4-6-8-9-8-14a4 4 0 018 0 4 4 0 018 0c0 5-4 8-8 14z" />
      </svg>
    </div>
  );
}
