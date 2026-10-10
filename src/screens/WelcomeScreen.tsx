import React from 'react';
import { motion } from 'framer-motion';
import { Tide } from '../components/Tide';
import { ThemeToggle } from '../components/ThemeToggle';
import { UISwitchButton } from '../components/UISwitchButton';
import { ThemeDecor } from '../components/decor/ThemeDecor';
import { useUITheme } from '../context/UIThemeContext';
import { getFramerTransition } from '../theme/uiThemes';
import { LinksyLogo } from '../components/LinksyLogo';
import { ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onGoSignup: () => void;
  onGoLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoSignup, onGoLogin }) => {
  const { themeDef } = useUITheme();

  return (
    <div className="relative h-dvh w-full max-w-md mx-auto bg-surface flex flex-col justify-between overflow-hidden select-none">
      {/* Visual Decor per UI look */}
      <ThemeDecor screen="welcome" />

      {/* Top right Theme Switcher & Look Switcher */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <UISwitchButton />
        <ThemeToggle />
      </div>

      {/* Top signature drifting Tide */}
      <Tide screen="welcome" />

      {/* Main bottom section below wave */}
      <div className="relative z-10 mt-auto px-6 pb-7 pt-3 flex flex-col gap-2.5">
        <motion.div
          key={`title-${themeDef.id}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getFramerTransition(themeDef.motionPreset, 0.25)}
          className="flex items-center mb-1"
        >
          <LinksyLogo className="h-12 sm:h-14 w-auto max-w-[260px] text-ink" />
        </motion.div>

        <motion.p
          key={`sub-${themeDef.id}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getFramerTransition(themeDef.motionPreset, 0.35)}
          className="text-[13px] font-medium text-muted mb-2"
        >
          Connect. Chat. Belong.
        </motion.p>

        <motion.div
          key={`actions-${themeDef.id}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getFramerTransition(themeDef.motionPreset, 0.45)}
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
        <footer className="w-full text-center pt-5 pb-1 flex flex-col gap-0.5 text-[11px] font-medium text-muted/75">
          <span className="text-[10px] text-muted/60">© 2026 FRZI TOOLS. All rights reserved.</span>
        </footer>
      </div>
    </div>
  );
};

