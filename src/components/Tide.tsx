import React from 'react';
import { motion } from 'framer-motion';

export type ScreenType = 'welcome' | 'auth' | 'chat' | 'admin';

interface TideProps {
  screen: ScreenType;
  scrollProgress?: number; // 0 to 1
  children?: React.ReactNode;
}

const BASE_HEIGHTS: Record<ScreenType, number> = {
  welcome: 380,
  auth: 150,
  chat: 92,
  admin: 148,
};

const SCROLL_DELTAS: Record<ScreenType, number> = {
  welcome: 0,
  auth: 0,
  chat: 8,
  admin: 50,
};

export const Tide: React.FC<TideProps> = ({ screen, scrollProgress = 0, children }) => {
  const baseHeight = BASE_HEIGHTS[screen];
  const delta = SCROLL_DELTAS[screen];
  const currentHeight = Math.max(60, baseHeight - delta * scrollProgress);

  return (
    <motion.div
      initial={false}
      animate={{ height: currentHeight }}
      transition={{ duration: 0.35, ease: [0.2, 0.9, 0.3, 1] }}
      className="absolute top-0 left-0 right-0 z-20 overflow-hidden pointer-events-none will-change-[height] transform-gpu"
    >
      {/* Frosted Glass Masked Tide Body */}
      <div className="absolute inset-0 tide-glass">
        {/* Translucent glass wave layers */}
        {screen === 'welcome' && (
          <svg
            className="absolute -left-[30%] bottom-[26px] w-[160%] h-[150px] pointer-events-none transition-opacity duration-500"
            viewBox="0 0 640 150"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M-40 20C120 -20 240 70 350 40S560 -10 680 25V150H-40Z"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.2)"
              vectorEffect="non-scaling-stroke"
              className="animate-glass-sway-1"
            />
            <path
              d="M-40 55C130 15 230 105 350 70S560 20 680 55V150H-40Z"
              fill="rgba(255,255,255,0.09)"
              stroke="rgba(255,255,255,0.22)"
              vectorEffect="non-scaling-stroke"
              className="animate-glass-sway-2"
            />
            <path
              d="M-40 90C120 50 250 130 360 100S560 55 680 90V150H-40Z"
              fill="rgba(255,255,255,0.13)"
              stroke="rgba(255,255,255,0.26)"
              vectorEffect="non-scaling-stroke"
              className="animate-glass-sway-3"
            />
          </svg>
        )}
      </div>

      {/* Signature Edge Stroke along Wave Curve */}
      <svg
        className="absolute left-0 bottom-0 w-full h-[40px] overflow-visible pointer-events-none"
        viewBox="0 0 340 40"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M340 20C290 42 230 6 170 22S60 40 0 12"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Header UI overlay content */}
      <div className="relative w-full h-full pointer-events-auto">
        {children}
      </div>
    </motion.div>
  );
};
