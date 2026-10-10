import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToInAppNotifications, type InAppToastPayload } from '../lib/notifications';
import { UserAvatar } from './UserAvatar';
import { X } from 'lucide-react';

interface InAppToastProps {
  onSelectConversation?: (conversationId: string) => void;
}

export const InAppToast: React.FC<InAppToastProps> = ({ onSelectConversation }) => {
  const [activeToast, setActiveToast] = useState<InAppToastPayload | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeToInAppNotifications((payload) => {
      setActiveToast(payload);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setActiveToast(null);
      }, 5000);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!activeToast) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={activeToast.id}
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto"
      >
        <div
          onClick={() => {
            if (activeToast.conversationId && onSelectConversation) {
              onSelectConversation(activeToast.conversationId);
            }
            setActiveToast(null);
          }}
          className="flex items-center gap-3 p-3 rounded-2xl bg-surface/95 backdrop-blur-md shadow-2xl border border-line text-ink cursor-pointer hover:bg-surface transition-all select-none"
        >
          <UserAvatar
            profile={{
              username: activeToast.senderName,
              avatar_url: activeToast.senderAvatar,
            }}
            size="sm"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-ink truncate leading-tight">
                {activeToast.senderName}
              </span>
              <span className="text-[10px] text-muted font-medium ml-2">Just now</span>
            </div>
            <p className="text-[12px] text-muted truncate mt-0.5 leading-tight">
              {activeToast.preview}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveToast(null);
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-field transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
