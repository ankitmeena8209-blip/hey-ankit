import React from 'react';
import { motion } from 'framer-motion';
import { Tide } from '../components/Tide';
import { ThemeToggle } from '../components/ThemeToggle';
import { ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onGoSignup: () => void;
  onGoLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoSignup, onGoLogin }) => {
  return (
    <div className="relative h-dvh w-full max-w-md mx-auto bg-surface flex flex-col justify-between overflow-hidden select-none">
      {/* Top right Theme Switcher */}
      <div className="absolute top-4 right-4 z-30">
        <ThemeToggle />
      </div>

      {/* Top signature drifting Tide */}
      <Tide screen="welcome" />

      {/* Main bottom section below wave */}
      <div className="relative z-10 mt-auto px-6 pb-7 pt-3 flex flex-col gap-2.5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.2, 1.35, 0.4, 1] }}
          className="flex items-center gap-3"
        >
          <img
            src="/logo-mark.png"
            alt="Hey Ankit Logo"
            className="w-12 h-12 object-contain"
          />
          <h1 className="font-display text-[42px] leading-tight text-ink tracking-tight">
            Hey Ankit
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35, ease: [0.2, 1.35, 0.4, 1] }}
          className="text-[13px] font-medium text-muted mb-2"
        >
          Private chat. Just us.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.45, ease: [0.2, 1.35, 0.4, 1] }}
          className="flex items-center justify-between gap-3 pt-1"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onGoLogin}
            className="text-[13px] font-semibold text-ink px-4 py-2.5 rounded-xl bg-field/80 shadow-neu-pill hover:bg-field transition-all min-h-[44px] flex items-center cursor-pointer"
          >
            I already have an account
          </motion.button>

          {/* Let's Go Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.94 }}
            onClick={onGoSignup}
            aria-label="Let's Go"
            className="px-5 py-2.5 rounded-xl bg-btn text-btn-ink flex items-center justify-center gap-2 font-display text-[15px] tracking-wide shadow-neu-float hover:opacity-90 transition-all flex-shrink-0 cursor-pointer min-h-[44px]"
          >
            <span>Let's Go</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </motion.button>
        </motion.div>

        {/* Footer */}
        <footer className="w-full text-center pt-5 text-[11px] font-semibold text-muted/75 tracking-wider uppercase">
          © Being Frzi
        </footer>
      </div>
    </div>
  );
};
