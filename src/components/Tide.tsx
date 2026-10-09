import React from 'react';
import { motion } from 'framer-motion';

export type ScreenType = 'welcome' | 'auth' | 'chat' | 'admin';

interface TideProps {
  screen: ScreenType;
  scrollProgress?: number; // 0 to 1
  children?: React.ReactNode;
}

const BASE_HEIGHTS: Record<ScreenType, number> = {
  welcome: 360,
  auth: 140,
  chat: 88,
  admin: 140,
};

const SCROLL_DELTAS: Record<ScreenType, number> = {
  welcome: 0,
  auth: 0,
  chat: 8,
  admin: 44,
};

export const Tide: React.FC<TideProps> = ({ screen, scrollProgress = 0, children }) => {
  const baseHeight = BASE_HEIGHTS[screen];
  const delta = SCROLL_DELTAS[screen];
  const currentHeight = Math.max(56, baseHeight - delta * scrollProgress);

  return (
    <motion.div
      initial={false}
      animate={{ height: currentHeight }}
      transition={{ duration: 0.3, ease: [0.2, 0.9, 0.3, 1] }}
      className="absolute top-0 left-0 right-0 z-20 overflow-hidden pointer-events-none will-change-[height] transform-gpu select-none"
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 340 380"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Deep Black / Tide Base */}
        <path
          d="M0 0 H340 V360 C290 382 230 346 170 362 S60 380 0 352 Z"
          fill="var(--color-tide)"
        />

        {/* Welcome Screen: 3 drifting wave layers */}
        {screen === 'welcome' && (
          <>
            <path
              d="M-40 270 C120 230 240 320 350 290 S560 240 680 275 V380 H-40 Z"
              fill="var(--color-l1)"
              className="animate-sway-1"
            />
            <path
              d="M-40 300 C130 260 230 350 350 315 S560 265 680 300 V380 H-40 Z"
              fill="var(--color-l2)"
              className="animate-sway-2"
            />
            <path
              d="M-40 330 C120 290 250 370 360 340 S560 295 680 330 V380 H-40 Z"
              fill="var(--color-l3)"
              className="animate-sway-3"
            />
          </>
        )}
      </svg>

      {/* Header UI overlay content */}
      <div className="relative w-full h-full pointer-events-auto">
        {children}
      </div>
    </motion.div>
  );
};
