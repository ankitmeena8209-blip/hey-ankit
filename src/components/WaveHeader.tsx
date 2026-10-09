import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, ArrowLeft } from 'lucide-react';
import { getInitials } from '../lib/utils';

interface WaveHeaderProps {
  title: string;
  subtitle?: string;
  isTyping?: boolean;
  onBack?: () => void;
  onLogout?: () => void;
  avatarInitial?: string;
  rightAction?: React.ReactNode;
}

export const WaveHeader: React.FC<WaveHeaderProps> = ({
  title,
  subtitle,
  isTyping,
  onBack,
  onLogout,
  avatarInitial,
  rightAction,
}) => {
  return (
    <header className="relative w-full z-20 select-none flex-shrink-0 shadow-sm">
      {/* Background Gradient */}
      <div className="relative pt-3 pb-3 px-4 sm:px-6 bg-gradient-to-r from-g1 via-g2 to-g3 text-white transition-all">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 min-h-[48px]">
          {/* Left section: Back button & Avatar */}
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onBack}
                aria-label="Go back"
                className="touch-target p-2 -ml-2 rounded-full hover:bg-white/15 active:bg-white/25 flex items-center justify-center transition-colors text-white"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </motion.button>
            )}

            {avatarInitial !== undefined && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-base shadow-inner flex-shrink-0"
              >
                {getInitials(avatarInitial)}
              </motion.div>
            )}

            <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-bold leading-tight tracking-tight truncate text-white drop-shadow-sm">
                {title}
              </h1>
              {isTyping ? (
                <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium">
                  <span>typing</span>
                  <span className="flex gap-0.5 items-center">
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                      className="w-1 h-1 bg-white rounded-full inline-block"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                      className="w-1 h-1 bg-white rounded-full inline-block"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                      className="w-1 h-1 bg-white rounded-full inline-block"
                    />
                  </span>
                </div>
              ) : subtitle ? (
                <p className="text-xs text-white/80 font-normal truncate">{subtitle}</p>
              ) : null}
            </div>
          </div>

          {/* Right section: Custom action or Logout */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {rightAction}
            {onLogout && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onLogout}
                className="touch-target px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/20 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* SVG Wave bottom curve */}
      <div className="w-full overflow-hidden leading-none -mt-[1px] pointer-events-none">
        <svg
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          className="relative block w-full h-4 sm:h-5 text-g2 fill-current"
        >
          <path d="M0,0 C150,45 350,-10 600,28 C850,65 1050,15 1200,32 L1200,0 L0,0 Z" />
        </svg>
      </div>
    </header>
  );
};
