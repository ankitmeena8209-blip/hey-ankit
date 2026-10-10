import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { supabase } from '../lib/supabase';
import type { UIThemeId, UIThemeDefinition } from '../theme/uiThemes';
import {
  UI_THEMES,
  getThemeById,
  getNextTheme,
} from '../theme/uiThemes';

interface OriginCoords {
  x: number;
  y: number;
}

interface UIThemeContextType {
  ui: UIThemeId;
  themeDef: UIThemeDefinition;
  cycleUI: (origin?: OriginCoords) => void;
  setUI: (id: UIThemeId, origin?: OriginCoords) => void;
  syncProfileTheme: (profileTheme?: string | null) => void;
  toastMessage: string | null;
}

const STORAGE_KEY = 'linksy-ui';

const UIThemeContext = createContext<UIThemeContextType | undefined>(undefined);

// Lazy font loader
const loadedFonts = new Set<string>();
function loadThemeFont(fontsUrl?: string) {
  if (!fontsUrl || loadedFonts.has(fontsUrl)) return;
  loadedFonts.add(fontsUrl);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontsUrl;
  document.head.appendChild(link);
}

function prefetchThemeFont(fontsUrl?: string) {
  if (!fontsUrl || loadedFonts.has(fontsUrl)) return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = fontsUrl;
      document.head.appendChild(link);
    });
  }
}

export const UIThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ui, setUiState] = useState<UIThemeId>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as UIThemeId | null;
      if (stored && UI_THEMES.some((t) => t.id === stored)) {
        return stored;
      }
    } catch {
      // ignore localStorage errors
    }
    return 'default';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const themeDef = getThemeById(ui);

  // Apply theme attributes to <html>
  const applyDOMAttributes = useCallback((themeId: UIThemeId) => {
    const def = getThemeById(themeId);
    const root = document.documentElement;
    root.dataset.ui = def.id;
    root.dataset.hd = def.headerMode;

    // Check low-end hardware
    const nav = navigator as Navigator & { deviceMemory?: number };
    const isLowEnd =
      (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) ||
      (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4);

    if (isLowEnd) {
      root.dataset.lite = 'true';
    } else {
      delete root.dataset.lite;
    }

    // Update meta theme-color tags
    const metaColor = getComputedStyle(root).getPropertyValue('--meta-color').trim();
    if (metaColor) {
      const metaTags = document.querySelectorAll('meta[name="theme-color"]');
      metaTags.forEach((tag) => {
        tag.setAttribute('content', metaColor);
      });
    }

    // Load fonts for current theme and prefetch next
    loadThemeFont(def.fontsUrl);
    const next = getNextTheme(def.id);
    prefetchThemeFont(next.fontsUrl);
  }, []);

  useEffect(() => {
    applyDOMAttributes(ui);
  }, [ui, applyDOMAttributes]);

  const showToast = useCallback((id: UIThemeId) => {
    const idx = UI_THEMES.findIndex((t) => t.id === id);
    const def = getThemeById(id);
    const text = `${idx + 1}/${UI_THEMES.length} · ${def.name}`;
    setToastMessage(text);
    const timer = setTimeout(() => {
      setToastMessage((cur) => (cur === text ? null : cur));
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const changeUIWithTransition = useCallback(
    (newId: UIThemeId, origin?: OriginCoords) => {
      try {
        localStorage.setItem(STORAGE_KEY, newId);
      } catch {
        // ignore
      }

      showToast(newId);

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Check if View Transition API is supported
      if (
        !prefersReducedMotion &&
        typeof document !== 'undefined' &&
        'startViewTransition' in document &&
        typeof (document as Document & { startViewTransition: (cb: () => void) => { ready: Promise<void> } }).startViewTransition === 'function'
      ) {
        const x = origin ? origin.x : window.innerWidth / 2;
        const y = origin ? origin.y : window.innerHeight / 2;

        const transition = (document as Document & { startViewTransition: (cb: () => void) => { ready: Promise<void> } }).startViewTransition(() => {
          flushSync(() => {
            setUiState(newId);
            applyDOMAttributes(newId);
          });
        });

        transition.ready
          .then(() => {
            const maxRadius = Math.hypot(
              Math.max(x, window.innerWidth - x),
              Math.max(y, window.innerHeight - y)
            );

            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${maxRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: 750,
                easing: 'cubic-bezier(0.65, 0, 0.2, 1)',
                pseudoElement: '::view-transition-new(root)',
              }
            );
          })
          .catch(() => {
            // view transition failed/canceled
          });
      } else {
        setUiState(newId);
        applyDOMAttributes(newId);
      }

      // Fire-and-forget background sync to Supabase RPC if user is authenticated
      try {
        Promise.resolve(supabase.rpc('set_ui_theme', { p_theme: newId })).catch(() => {});
      } catch {
        // ignore network/auth errors
      }
    },
    [applyDOMAttributes, showToast]
  );

  const syncProfileTheme = useCallback(
    (profileTheme?: string | null) => {
      if (profileTheme && UI_THEMES.some((t) => t.id === profileTheme)) {
        setUiState((current) => {
          if (current !== profileTheme) {
            try {
              localStorage.setItem(STORAGE_KEY, profileTheme);
            } catch {
              // ignore
            }
            applyDOMAttributes(profileTheme as UIThemeId);
            return profileTheme as UIThemeId;
          }
          return current;
        });
      }
    },
    [applyDOMAttributes]
  );

  const cycleUI = useCallback(
    (origin?: OriginCoords) => {
      const next = getNextTheme(ui);
      changeUIWithTransition(next.id, origin);
    },
    [ui, changeUIWithTransition]
  );

  const setUI = useCallback(
    (id: UIThemeId, origin?: OriginCoords) => {
      if (id !== ui) {
        changeUIWithTransition(id, origin);
      }
    },
    [ui, changeUIWithTransition]
  );

  return (
    <UIThemeContext.Provider value={{ ui, themeDef, cycleUI, setUI, syncProfileTheme, toastMessage }}>
      {children}
      {/* Toast pill */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 py-2 rounded-full bg-black/85 text-white text-xs font-semibold shadow-2xl backdrop-blur-md animate-fade-in transition-all select-none"
        >
          {toastMessage}
        </div>
      )}
    </UIThemeContext.Provider>
  );
};

export const useUITheme = () => {
  const context = useContext(UIThemeContext);
  if (!context) {
    throw new Error('useUITheme must be used within a UIThemeProvider');
  }
  return context;
};
