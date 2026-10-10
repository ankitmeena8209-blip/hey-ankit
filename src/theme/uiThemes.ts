export type UIThemeId = 'default' | 'rose' | 'sapphire' | 'lime' | 'clay' | 'kawaii';
export type HeaderMode = 'wave' | 'bar' | 'blob';

export interface MotionPreset {
  type: 'spring' | 'tween';
  stiffness?: number;
  damping?: number;
  ease?: [number, number, number, number];
  duration?: number;
}

export interface UIThemeDefinition {
  id: UIThemeId;
  name: string;
  headerMode: HeaderMode;
  fontsUrl?: string;
  motionPreset: MotionPreset;
}

export const UI_THEMES: UIThemeDefinition[] = [
  {
    id: 'default',
    name: 'Wave',
    headerMode: 'wave',
    motionPreset: {
      type: 'spring',
      stiffness: 260,
      damping: 18,
    },
  },
  {
    id: 'rose',
    name: 'Rose glass',
    headerMode: 'bar',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
    motionPreset: {
      type: 'tween',
      ease: [0.22, 1, 0.36, 1],
      duration: 0.9,
    },
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    headerMode: 'bar',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap',
    motionPreset: {
      type: 'tween',
      ease: [0.16, 1, 0.3, 1],
      duration: 0.75,
    },
  },
  {
    id: 'lime',
    name: 'Lime pop',
    headerMode: 'blob',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap',
    motionPreset: {
      type: 'spring',
      stiffness: 420,
      damping: 14,
    },
  },
  {
    id: 'clay',
    name: 'Lavender clay',
    headerMode: 'blob',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800&display=swap',
    motionPreset: {
      type: 'spring',
      stiffness: 300,
      damping: 12,
    },
  },
  {
    id: 'kawaii',
    name: 'Pink gingham',
    headerMode: 'blob',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Chewy&family=Quicksand:wght@600;700&display=swap',
    motionPreset: {
      type: 'spring',
      stiffness: 520,
      damping: 15,
    },
  },
];

export const TIDE_HEIGHTS: Record<HeaderMode, { welcome: number; auth: number; chat: number; inbox: number }> = {
  wave: { welcome: 380, auth: 150, chat: 92, inbox: 148 },
  bar: { welcome: 0, auth: 0, chat: 74, inbox: 132 },
  blob: { welcome: 0, auth: 132, chat: 84, inbox: 148 },
};

export const SCROLL_DELTAS: Record<HeaderMode, { chat: number; inbox: number }> = {
  wave: { chat: 8, inbox: 50 },
  bar: { chat: 0, inbox: 42 },
  blob: { chat: 6, inbox: 46 },
};

export const getThemeById = (id: UIThemeId): UIThemeDefinition => {
  return UI_THEMES.find((t) => t.id === id) || UI_THEMES[0];
};

export const getNextTheme = (currentId: UIThemeId): UIThemeDefinition => {
  const currentIndex = UI_THEMES.findIndex((t) => t.id === currentId);
  const nextIndex = (currentIndex + 1) % UI_THEMES.length;
  return UI_THEMES[nextIndex];
};

export const motionPresets: Record<UIThemeId, MotionPreset> = {
  default: { type: 'spring', stiffness: 260, damping: 18 },
  rose: { type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.9 },
  sapphire: { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.75 },
  lime: { type: 'spring', stiffness: 420, damping: 14 },
  clay: { type: 'spring', stiffness: 300, damping: 12 },
  kawaii: { type: 'spring', stiffness: 520, damping: 15 },
};

export const getFramerTransition = (preset: MotionPreset, delay = 0) => {
  if (preset.type === 'spring') {
    return {
      type: 'spring' as const,
      stiffness: preset.stiffness ?? 260,
      damping: preset.damping ?? 18,
      delay,
    };
  }
  return {
    duration: preset.duration ?? 0.75,
    ease: preset.ease ?? [0.22, 1, 0.36, 1],
    delay,
  };
};

