import React from 'react';
import { motion } from 'framer-motion';

export type ScreenType = 'welcome' | 'auth' | 'chat' | 'admin';

interface TideProps {
  screen: ScreenType;
  scrollProgress?: number; // 0 to 1
  children?: React.ReactNode;
}

const BASE_HEIGHTS: Record<ScreenType, number> = {
  welcome: 430,
  auth: 168,
  chat: 112,
  admin: 176,
};

const SCROLL_DELTAS: Record<ScreenType, number> = {
  welcome: 0,
  auth: 0,
  chat: 26,
  admin: 84,
};

export const Tide: React.FC<TideProps> = ({ screen, scrollProgress = 0, children }) => {
  const baseHeight = BASE_HEIGHTS[screen];
  const delta = SCROLL_DELTAS[screen];
  const currentHeight = Math.max(70, baseHeight - delta * scrollProgress);

  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: currentHeight }}
      transition={{ duration: 1.05, ease: [0.7, 0, 0.2, 1] }}
      className="absolute top-0 left-0 right-0 z-20 bg-tide overflow-hidden pointer-events-none"
    >
      {/* Welcome screen floating wave layers */}
      {screen === 'welcome' && (
        <svg
          className="absolute -left-[30%] bottom-[30px] w-[160%] h-[170px] pointer-events-none transition-opacity duration-500"
          viewBox="0 0 640 150"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M-40 20C120 -20 240 70 350 40S560 -10 680 25V150H-40Z"
            fill="var(--color-l1)"
            className="animate-sway-1"
          />
          <path
            d="M-40 55C130 15 230 105 350 70S560 20 680 55V150H-40Z"
            fill="var(--color-l2)"
            className="animate-sway-2"
          />
          <path
            d="M-40 90C120 50 250 130 360 100S560 55 680 90V150H-40Z"
            fill="var(--color-l3)"
            className="animate-sway-3"
          />
        </svg>
      )}

      {/* Signature bottom SVG wave curve in surface color */}
      <svg
        className="absolute left-0 -bottom-[1px] w-full h-[56px] pointer-events-none"
        viewBox="0 0 340 56"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 56V36C50 6 110 4 170 26S290 54 340 12V56Z"
          fill="var(--color-surface)"
        />
      </svg>

      {/* Header UI overlay content (clicks re-enabled for interactive elements) */}
      <div className="relative w-full h-full pointer-events-auto">
        {children}
      </div>
    </motion.div>
  );
};
