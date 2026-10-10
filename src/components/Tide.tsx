import React from 'react';
import { motion } from 'framer-motion';
import { useUITheme } from '../context/UIThemeContext';
import { TIDE_HEIGHTS, SCROLL_DELTAS } from '../theme/uiThemes';

export type ScreenType = 'welcome' | 'auth' | 'chat' | 'admin';

interface TideProps {
  screen: ScreenType;
  scrollProgress?: number; // 0 to 1
  children?: React.ReactNode;
}

export const Tide: React.FC<TideProps> = ({ screen, scrollProgress = 0, children }) => {
  const { themeDef } = useUITheme();
  const headerMode = themeDef.headerMode;

  // Map screen key
  const screenKey = screen === 'admin' ? 'inbox' : screen;
  const baseHeight = TIDE_HEIGHTS[headerMode][screenKey];
  const delta = SCROLL_DELTAS[headerMode][screenKey === 'welcome' || screenKey === 'auth' ? 'chat' : screenKey];
  const currentHeight = Math.max(0, baseHeight - delta * scrollProgress);

  return (
    <motion.div
      initial={false}
      animate={{ height: currentHeight, opacity: currentHeight > 0 ? 1 : 0 }}
      transition={{ duration: 0.45, ease: [0.7, 0, 0.2, 1] }}
      className="absolute top-0 left-0 right-0 z-20 overflow-hidden pointer-events-none will-change-[height] transform-gpu select-none"
    >
      {headerMode === 'wave' ? (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 340 380"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Deep Black / Tide Base */}
          <path
            d="M0 0 H340 V360 C290 382 230 346 170 362 S60 380 0 352 Z"
            fill="var(--hb, var(--color-tide))"
          />

          {/* Welcome Screen: 3 drifting wave layers */}
          {screen === 'welcome' && (
            <>
              <path
                d="M-40 270 C120 230 240 320 350 290 S560 240 680 275 V380 H-40 Z"
                fill="var(--l1, var(--color-l1))"
                className="animate-sway-1"
              />
              <path
                d="M-40 300 C130 260 230 350 350 315 S560 265 680 300 V380 H-40 Z"
                fill="var(--l2, var(--color-l2))"
                className="animate-sway-2"
              />
              <path
                d="M-40 330 C120 290 250 370 360 340 S560 295 680 330 V380 H-40 Z"
                fill="var(--l3, var(--color-l3))"
                className="animate-sway-3"
              />
            </>
          )}
        </svg>
      ) : (
        /* Floating bar (bar) or full-width band (blob) */
        <div className="tide-bar" />
      )}

      {/* Header UI overlay content */}
      <div className="relative w-full h-full pointer-events-auto">
        {children}
      </div>
    </motion.div>
  );
};
