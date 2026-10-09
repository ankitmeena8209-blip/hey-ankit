import React from 'react';
import { motion } from 'framer-motion';
import { Tide } from '../components/Tide';
import { ThemeToggle } from '../components/ThemeToggle';
import { GlassBackground } from '../components/GlassBackground';
import { ArrowRight } from 'lucide-react';


interface WelcomeScreenProps {
  onGoSignup: () => void;
  onGoLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoSignup, onGoLogin }) => {
  return (
    <div className="relative h-dvh w-full max-w-md mx-auto flex flex-col justify-between overflow-hidden select-none" data-s="welcome">
      {/* Dynamic Glass Ambient Orbs & Veil */}
      <GlassBackground screen="welcome" />

      {/* Top right Theme Switcher */}
      <div className="absolute top-4 right-4 z-40">
        <ThemeToggle />
      </div>

      {/* Top signature glass Tide */}
      <Tide screen="welcome" />

      {/* Main bottom section below wave */}
      <div className="relative z-10 mt-auto px-6 pb-8 pt-4 flex flex-col gap-3">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.2, 1.3, 0.4, 1] }}
          className="font-display font-bold text-[40px] sm:text-[44px] leading-tight text-ink tracking-tight"
        >
          Hey Ankit
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.2, 1.3, 0.4, 1] }}
          className="text-[13px] font-medium text-muted mb-3"
        >
          Private chat. Just us.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease: [0.2, 1.3, 0.4, 1] }}
          className="flex items-center justify-between gap-3 pt-1"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onGoLogin}
            className="gbtn text-[12px] font-bold px-4 py-2.5 rounded-[14px] min-h-[44px] flex items-center justify-center transition-all cursor-pointer"
          >
            I already have an account
          </motion.button>

          {/* Let's Go Button replacing old round play button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.94 }}
            onClick={onGoSignup}
            aria-label="Let's Go"
            className="btn-sent sheen px-5 py-2.5 rounded-[18px] min-h-[44px] flex items-center justify-center gap-2 text-white font-display font-bold text-[14px] shadow-lg hover:opacity-95 transition-all cursor-pointer flex-shrink-0"
          >
            <span>Let's Go</span>
            <ArrowRight className="w-4 h-4 stroke-[2.6]" />
          </motion.button>
        </motion.div>

        {/* Footer */}
        <footer className="w-full text-center pt-5 text-[11px] font-semibold text-muted/75 tracking-wider">
          © Being Frzi
        </footer>
      </div>
    </div>
  );
};

