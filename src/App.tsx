import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import { SetupBanner } from './components/SetupBanner';
import { AuthScreen } from './screens/AuthScreen';
import { ChatScreen } from './screens/ChatScreen';
import { AdminInbox } from './screens/AdminInbox';
import { Loader2 } from 'lucide-react';

const MainRouter: React.FC = () => {
  const { user, profile, isAdmin, loading } = useAuth();

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
      <div className="h-dvh w-full bg-page flex flex-col items-center justify-center text-white gap-3 select-none">
        <Loader2 className="w-9 h-9 animate-spin text-white drop-shadow" />
        <span className="font-semibold text-sm tracking-wide text-white/90">
          Loading Hey Ankit...
        </span>
      </div>
    );
  }

  // Not authenticated
  if (!user || !profile) {
    return <AuthScreen />;
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
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
