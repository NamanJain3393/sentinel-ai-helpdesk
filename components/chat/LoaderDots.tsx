"use client";

import { motion } from "framer-motion";

export default function LoaderDots({ status = "Thinking..." }: { status?: string }) {
  return (
    <div className="flex flex-col items-start gap-1">
      {status && <span className="text-[10px] font-medium text-slate-400 animate-pulse mb-1">{status}</span>}
      <div className="flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"
            animate={{
              y: [0, -8, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

