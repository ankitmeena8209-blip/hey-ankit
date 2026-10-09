import React, { useState, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import { SetupBanner } from './components/SetupBanner';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { AuthScreen } from './screens/AuthScreen';
import { ChatScreen } from './screens/ChatScreen';
import { AdminInbox } from './screens/AdminInbox';
import { Loader2 } from 'lucide-react';

const MainRouter: React.FC = () => {
  const { user, profile, isAdmin, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'signup' | 'login' | null>(null);

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
      <div className="h-dvh w-full bg-surface flex flex-col items-center justify-center text-ink gap-3 select-none">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
        <span className="font-display text-xl tracking-wide text-ink">
          Hey Ankit
        </span>
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

  // Admin lands on Admin Inbox (Chats, Users, Unsent Log)
  if (isAdmin) {
    return <AdminInbox />;
  }

  // Friend lands directly in 1:1 private chat with Ankit
  return <ChatScreen />;
};

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupBanner />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <MainRouter />
      </AuthProvider>
    </MotionConfig>
  );
}
