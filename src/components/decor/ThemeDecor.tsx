import React, { Suspense, lazy } from 'react';
import { useUITheme } from '../../context/UIThemeContext';

const RoseDecor = lazy(() => import('./RoseDecor'));
const SapphireDecor = lazy(() => import('./SapphireDecor'));
const LimeDecor = lazy(() => import('./LimeDecor'));
const ClayDecor = lazy(() => import('./ClayDecor'));
const KawaiiDecor = lazy(() => import('./KawaiiDecor'));

interface ThemeDecorProps {
  screen: 'welcome' | 'auth' | 'chat' | 'inbox';
}

export const ThemeDecor: React.FC<ThemeDecorProps> = ({ screen }) => {
  const { ui } = useUITheme();

  if (ui === 'default') return null;

  return (
    <Suspense fallback={null}>
      {ui === 'rose' && <RoseDecor screen={screen} />}
      {ui === 'sapphire' && <SapphireDecor screen={screen} />}
      {ui === 'lime' && <LimeDecor screen={screen} />}
      {ui === 'clay' && <ClayDecor screen={screen} />}
      {ui === 'kawaii' && <KawaiiDecor screen={screen} />}
    </Suspense>
  );
};

export default ThemeDecor;
