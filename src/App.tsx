import React, { useState, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { UIThemeProvider, useUITheme } from './context/UIThemeContext';
import { PresenceProvider } from './context/PresenceContext';
import { isSupabaseConfigured } from './lib/supabase';
import { SetupBanner } from './components/SetupBanner';
import { InAppToast } from './components/InAppToast';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { AuthScreen } from './screens/AuthScreen';
import { InboxScreen } from './screens/InboxScreen';
import { Loader2 } from 'lucide-react';
import { LinksyLogo } from './components/LinksyLogo';

const MainRouter: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const { syncProfileTheme } = useUITheme();
  const [authMode, setAuthMode] = useState<'signup' | 'login' | null>(null);
  const [initialConvId, setInitialConvId] = useState<string | null>(null);

  // Sync profile UI theme on login without blocking network
  useEffect(() => {
    if (profile?.ui_theme) {
      syncProfileTheme(profile.ui_theme);
    }
  }, [profile?.ui_theme, syncProfileTheme]);

  // Check URL query parameters or service worker messages for target conversation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const convParam = urlParams.get('conv');
      if (convParam) {
        setInitialConvId(convParam);
      }

      // Listen for message from service worker notification click
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data?.type === 'LINKSY_OPEN_CONVERSATION' && event.data?.conversationId) {
          setInitialConvId(event.data.conversationId);
        }
      };

      navigator.serviceWorker?.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
      };
    }
  }, []);

  // Mobile visualViewport resize handling to keep composer above software keyboard
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      const height = window.visualViewport?.height;
      if (height) {
        document.documentElement.style.setProperty('--viewport-height', `${height}px`);
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-dvh w-full bg-surface flex flex-col items-center justify-between py-8 text-ink select-none">
        <div />
        <div className="flex flex-col items-center gap-3 text-ink">
          <LinksyLogo className="h-10 w-auto text-ink" />
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
        <div className="text-[10px] text-muted/60 font-medium pb-2">
          © 2026 FRZI TOOLS. All rights reserved.
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user || !profile) {
    if (authMode === null) {
      return (
        <WelcomeScreen
          onGoSignup={() => setAuthMode('signup')}
          onGoLogin={() => setAuthMode('login')}
        />
      );
    }
    return (
      <AuthScreen
        initialMode={authMode}
        onBackToWelcome={() => setAuthMode(null)}
      />
    );
  }

  // Authenticated: Unified multi-user inbox & messaging screen
  return (
    <>
      <InAppToast onSelectConversation={(convId) => setInitialConvId(convId)} />
      <InboxScreen initialConversationId={initialConvId} />
    </>
  );
};

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupBanner />;
  }

  return (
    <ThemeProvider>
      <UIThemeProvider>
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            <PresenceProvider>
              <MainRouter />
            </PresenceProvider>
          </AuthProvider>
        </MotionConfig>
      </UIThemeProvider>
    </ThemeProvider>
  );
}
