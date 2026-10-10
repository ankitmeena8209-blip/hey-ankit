import React from 'react';
import { motion } from 'framer-motion';
import { useUITheme } from '../context/UIThemeContext';
import { getNextTheme } from '../theme/uiThemes';
import { Palette } from 'lucide-react';

interface UISwitchButtonProps {
  className?: string;
}

export const UISwitchButton: React.FC<UISwitchButtonProps> = ({ className = '' }) => {
  const { ui, cycleUI } = useUITheme();
  const nextTheme = getNextTheme(ui);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    cycleUI(origin);
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9, rotate: 20 }}
      onClick={handleClick}
      aria-label={`Change look. Next: ${nextTheme.name}`}
      title={`Change look (${nextTheme.name})`}
      className={`ui-hbtn select-none ${className}`}
    >
      <Palette className="w-4 h-4 stroke-[2.2]" />
    </motion.button>
  );
};
