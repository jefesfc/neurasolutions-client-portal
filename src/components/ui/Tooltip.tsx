import { useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-surface-800 rounded-lg shadow-lg pointer-events-none whitespace-nowrap",
              side === "top" && "bottom-full mb-2",
              side === "bottom" && "top-full mt-2",
              side === "left" && "right-full mr-2",
              side === "right" && "left-full ml-2"
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
