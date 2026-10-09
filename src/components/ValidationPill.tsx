import React from 'react';
import { motion } from 'framer-motion';

interface ValidationPillProps {
  isValid: boolean;
  label: string;
}

export const ValidationPill: React.FC<ValidationPillProps> = ({ isValid, label }) => {
  return (
    <div
      className="w-[52px] h-[34px] rounded-[17px] bg-pill border border-line flex items-center justify-center flex-shrink-0 relative overflow-hidden select-none"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{isValid ? `${label} valid` : `${label} invalid`}</span>

      <svg width="22" height="22" viewBox="0 0 24 24" className="overflow-visible">
        {/* Invalid Orange X */}
        <motion.path
          d="M7 7l10 10M17 7L7 17"
          fill="none"
          stroke="var(--color-bad)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{
            opacity: isValid ? 0 : 1,
            scale: isValid ? 0.3 : 1,
            rotate: isValid ? 90 : 0,
          }}
          transition={{ duration: 0.25 }}
        />

        {/* Valid Green Tick (draws itself with spring pop) */}
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          fill="none"
          stroke="var(--color-ok)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{
            pathLength: isValid ? 1 : 0,
            opacity: isValid ? 1 : 0,
            scale: isValid ? [0.8, 1.25, 1] : 0.8,
          }}
          transition={{
            pathLength: { duration: 0.35, ease: 'easeOut' },
            scale: { duration: 0.4, ease: [0.2, 1.35, 0.4, 1] },
            opacity: { duration: 0.2 },
          }}
        />
      </svg>
    </div>
  );
};
