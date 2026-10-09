import React from 'react';
import { motion } from 'framer-motion';
import { Tide } from '../components/Tide';

interface WelcomeScreenProps {
  onGoSignup: () => void;
  onGoLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoSignup, onGoLogin }) => {
  return (
    <div className="relative h-dvh w-full max-w-md mx-auto bg-surface flex flex-col justify-between overflow-hidden select-none">
      {/* Top signature drifting Tide */}
      <Tide screen="welcome" />

      {/* Main bottom section below wave */}
      <div className="relative z-10 mt-auto px-6 pb-8 pt-4 flex flex-col gap-2">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.2, 1.35, 0.4, 1] }}
          className="font-display text-[54px] sm:text-[58px] leading-none text-ink tracking-wide"
        >
          Hey Ankit
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease: [0.2, 1.35, 0.4, 1] }}
          className="text-sm font-medium text-muted mb-4"
        >
          Private chat. Just us.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55, ease: [0.2, 1.35, 0.4, 1] }}
          className="flex items-center justify-between gap-4 pt-1"
        >
          <button
            type="button"
            onClick={onGoLogin}
            className="text-[13px] font-semibold text-ink underline underline-offset-4 min-h-[44px] flex items-center hover:opacity-80 transition-opacity"
          >
            I already have an account
          </button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onGoSignup}
            aria-label="Get started"
            className="w-[54px] h-[54px] rounded-full bg-btn text-btn-ink flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
              <path d="M7 4l13 8-13 8z" />
            </svg>
          </motion.button>
        </motion.div>

        {/* Footer */}
        <footer className="w-full text-center pt-6 text-[11px] font-medium text-muted/80">
          © Being Frzi
        </footer>
      </div>
    </div>
  );
};
