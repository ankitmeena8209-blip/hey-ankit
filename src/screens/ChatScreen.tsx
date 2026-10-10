import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../context/PresenceContext';
import type { Message, Conversation, Profile } from '../types/database';
import { Tide } from '../components/Tide';
import { WaveComposer } from '../components/WaveComposer';
import { MessageBubble } from '../components/MessageBubble';
import { ImageModal } from '../components/ImageModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { UISwitchButton } from '../components/UISwitchButton';
import { ThemeDecor } from '../components/decor/ThemeDecor';
import { UserAvatar } from '../components/UserAvatar';
import { formatChatDate, getDisplayName } from '../lib/utils';
import { ArrowLeft, Loader2, Bell, BellOff } from 'lucide-react';
import {
  sendLinksyNotification,
  requestNotificationPermission,
  isNotificationSupported,
  getNotificationPermission,
} from '../lib/notifications';

interface ChatScreenProps {
  conversationId?: string;
  partnerUsername?: string;
  onBack?: () => void;
}

const PAGE_SIZE = 30;

export const ChatScreen: React.FC<ChatScreenProps> = ({
  conversationId: propConversationId,
  partnerUsername: propPartnerUsername,
  onBack,
}) => {
  const { user, profile, logout } = useAuth();
  const { isUserOnline } = usePresence();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Partial<Profile> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(getNotificationPermission());

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isNearBottomRef = useRef<boolean>(true);

  const handleToggleNotification = async () => {
    if (notifPerm === 'granted') {
      sendLinksyNotification({
        senderName: 'Linksy',
        preview: 'Notifications are active and sound is enabled!',
      });
      return;
    }
    const { permission } = await requestNotificationPermission();
    setNotifPerm(permission);
    if (permission === 'granted') {
      sendLinksyNotification({
        senderName: 'Linksy',
        preview: 'Branded notifications enabled for Linksy!',
      });
    }
  };

  // 1. Resolve conversation and partner profile
  useEffect(() => {
    let isMounted = true;

    async function initConversation() {
      setLoading(true);
      try {
        if (propConversationId) {
          const { data, error } = await supabase
            .from('conversations')
            .select(`
              *,
              user:profiles!conversations_user_id_fkey(*),
              recipient:profiles!conversations_recipient_id_fkey(*),
              admin:profiles!conversations_admin_id_fkey(*)
            `)
            .eq('id', propConversationId)
            .single();

          if (!error && data && isMounted) {
            const conv = data as unknown as Conversation;
            setConversation(conv);

            // Determine other participant
            const other =
              conv.user_id === user?.id
                ? conv.recipient || conv.admin || null
                : conv.user || null;

            if (other) {
              setPartnerProfile(other);
            } else {
              // Fallback query partner profile
              const targetId =
                conv.user_id === user?.id
                  ? conv.recipient_id || conv.admin_id
                  : conv.user_id;

              if (targetId) {
                const { data: pData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', targetId)
                  .maybeSingle();
                if (pData && isMounted) {
                  setPartnerProfile(pData as Profile);
                }
              }
            }
          }
        } else {
          const { data, error } = await supabase.rpc('get_or_create_my_conversation');
          if (!error && data && isMounted) {
            setConversation(data as Conversation);
          }
        }
      } catch (err) {
        console.error('Failed to init conversation:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initConversation();
    return () => {
      isMounted = false;
    };
  }, [propConversationId, user?.id]);

  const partnerId = conversation
    ? conversation.user_id === user?.id
      ? conversation.recipient_id || conversation.admin_id
      : conversation.user_id
    : null;

  const isPartnerOnline = partnerId ? isUserOnline(partnerId) : false;

  const partnerDisplayName = partnerProfile
    ? getDisplayName(partnerProfile as Profile)
    : propPartnerUsername || 'Chat';

  // 2. Mark messages read
  const markRead = useCallback(async (convId: string) => {
    if (document.hidden) return;
    try {
      await supabase.rpc('mark_messages_read', { p_conversation_id: convId });
    } catch {
      // ignore
    }
  }, []);

  // 3. Load latest 30 messages
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      if (data) {
        const sorted = (data as Message[]).reverse();
        setMessages(sorted);
        setHasMore(data.length === PAGE_SIZE);
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, []);

  // 4. Load older messages on scroll-up
  const loadOlderMessages = async () => {
    if (!conversation || loadingOlder || !hasMore || messages.length === 0) return;

    const oldestMessage = messages[0];
    const container = messagesContainerRef.current;
    if (!container) return;

    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;

    setLoadingOlder(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      if (data && data.length > 0) {
        const olderSorted = (data as Message[]).reverse();
        setMessages((prev) => [...olderSorted, ...prev]);
        setHasMore(data.length === PAGE_SIZE);

        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // 5. Setup Realtime subscription
  useEffect(() => {
    if (!conversation?.id) return;
    const convId = conversation.id;

    loadMessages(convId);
    markRead(convId);

    const channel = supabase
      .channel(`chat:${convId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) {
                return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
              }
              return [...prev, newMsg];
            });

            if (isNearBottomRef.current) {
              setTimeout(() => {
                if (messagesContainerRef.current) {
                  messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
              }, 60);
            }

            if (newMsg.sender_id !== user?.id) {
              if (document.hidden) {
                sendLinksyNotification({
                  senderName: partnerDisplayName,
                  senderAvatar: partnerProfile?.avatar_url,
                  preview:
                    newMsg.type === 'image'
                      ? '📷 Sent a photo'
                      : newMsg.body
                      ? newMsg.body.length > 50
                        ? newMsg.body.slice(0, 50) + '...'
                        : newMsg.body
                      : 'Sent a message',
                  conversationId: convId,
                });
              }
              markRead(convId);
              setIsTyping(false);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Message;
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
            );
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { senderId } = payload.payload || {};
        if (senderId && senderId !== user?.id) {
          setIsTyping(true);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 4000);
        }
      })
      .subscribe();

    channelRef.current = channel;

    const handleVisibility = () => {
      if (!document.hidden) {
        markRead(convId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [conversation?.id, loadMessages, markRead, user?.id, partnerDisplayName, partnerProfile?.avatar_url]);

  const scrollRafRef = useRef<number | null>(null);

  // Scroll listener for dynamic tide height shrinkage
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const threshold = 120;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    isNearBottomRef.current = isBottom;

    if (el.scrollTop <= 20 && hasMore && !loadingOlder) {
      loadOlderMessages();
    }

    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (!el) return;
      const prog = Math.min(el.scrollTop / 90, 1);
      setScrollProgress(prog);
    });
  };

  const handleTyping = () => {
    if (!channelRef.current || !user?.id) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { senderId: user.id, username: profile?.username },
    });
  };

  const handleSendMessage = async (
    text: string,
    imagePayload?: { blob: Blob; ext: string; isOneTime?: boolean }
  ) => {
    if (!conversation?.id || !user?.id) return;

    let imagePath: string | null = null;

    if (imagePayload) {
      const fileExt = imagePayload.ext;
      const fileUuid = crypto.randomUUID();
      const path = `${conversation.id}/${fileUuid}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(path, imagePayload.blob, {
          contentType: fileExt === 'webp' ? 'image/webp' : 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      imagePath = path;
    }

    const { error: insertError } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      type: imagePath ? 'image' : 'text',
      body: text || null,
      image_path: imagePath,
    });

    if (insertError) throw insertError;
  };

  const handleMarkOneTimeViewed = async (messageId: string) => {
    if (!user?.id) return;
    try {
      await supabase.rpc('mark_one_time_viewed', {
        p_message_id: messageId,
        p_user_id: user.id,
      });
      // Optimistically update local message state
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            const currentViewed = m.viewed_by || [];
            return {
              ...m,
              viewed_by: currentViewed.includes(user.id)
                ? currentViewed
                : [...currentViewed, user.id],
            };
          }
          return m;
        })
      );
    } catch (err) {
      console.error('Failed to mark one-time viewed:', err);
    }
  };

  const handleEditMessage = async (messageId: string, newBody: string) => {
    const { error } = await supabase.rpc('edit_message', {
      p_message_id: messageId,
      p_new_body: newBody,
    });
    if (error) {
      alert(`Edit failed: ${error.message}`);
      throw error;
    }
  };

  const handleUnsendMessage = async (messageId: string) => {
    const { error } = await supabase.rpc('unsend_message', {
      p_message_id: messageId,
    });
    if (error) {
      alert(`Unsend failed: ${error.message}`);
      throw error;
    }
  };

  const renderMessageList = () => {
    const elements: React.ReactNode[] = [];
    let lastDateStr = '';

    messages.forEach((msg) => {
      const dateStr = formatChatDate(msg.created_at);
      if (dateStr && dateStr !== lastDateStr) {
        lastDateStr = dateStr;
        elements.push(
          <div key={`date-${msg.id}`} className="flex justify-center my-2.5 select-none">
            <span className="px-3 py-1 rounded-full bg-field/80 shadow-neu-pill text-[11px] font-semibold text-muted tracking-wide">
              {dateStr}
            </span>
          </div>
        );
      }

      elements.push(
        <MessageBubble
          key={msg.id}
          message={msg}
          isSent={msg.sender_id === user?.id}
          onEdit={handleEditMessage}
          onUnsend={handleUnsendMessage}
          onImageClick={(url) => setEnlargedImageUrl(url)}
          onMarkOneTimeViewed={handleMarkOneTimeViewed}
        />
      );
    });

    return elements;
  };

  return (
    <div className="relative h-dvh w-full max-w-md mx-auto bg-surface flex flex-col justify-between overflow-hidden select-none">
      {/* Visual Decor per UI look */}
      <ThemeDecor screen="chat" />

      {/* Top Tide Header with Scroll Link */}
      <Tide screen="chat" scrollProgress={scrollProgress}>
        <div className="absolute left-3.5 right-3.5 top-3 flex items-center gap-2.5 h-12">
          {onBack && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              aria-label="Back to inbox"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-all flex-shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
            </motion.button>
          )}

          {/* User Avatar with Realtime Status Badge */}
          <UserAvatar
            profile={partnerProfile || { username: partnerDisplayName }}
            size="sm"
            isOnline={isPartnerOnline}
            showOnlineStatus
          />

          {/* Name & Realtime Status */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <b
              className="font-display font-normal text-[20px] leading-tight text-white truncate origin-left transition-transform duration-100"
              style={{ transform: `scale(${1 - 0.12 * scrollProgress})` }}
            >
              {partnerDisplayName}
            </b>
            <div className="flex items-center gap-1.5 min-h-[14px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isTyping
                    ? 'bg-emerald-400 animate-ping'
                    : isPartnerOnline
                    ? 'bg-emerald-400'
                    : 'bg-white/40'
                }`}
              />
              <small className="text-[11px] text-white/75 block truncate leading-tight font-medium">
                {isTyping ? 'typing…' : isPartnerOnline ? 'Active now' : 'Offline'}
              </small>
            </div>
          </div>

          {/* Notification Permission Toggle */}
          {isNotificationSupported() && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleNotification}
              title={notifPerm === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
              aria-label={notifPerm === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-all flex-shrink-0 cursor-pointer"
            >
              {notifPerm === 'granted' ? (
                <Bell className="w-4 h-4 text-emerald-300 stroke-[2.2]" />
              ) : (
                <BellOff className="w-4 h-4 text-white/70 stroke-[2]" />
              )}
            </motion.button>
          )}

          {/* UI Switch Button */}
          <UISwitchButton />

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Outlined Log out Pill */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="h-9 px-3.5 rounded-full ui-hbtn text-xs font-semibold hover:opacity-90 transition-all flex-shrink-0 select-none flex items-center justify-center cursor-pointer"
          >
            Log out
          </motion.button>
        </div>
      </Tide>

      {/* Main chat body (scrolls under the tide) */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 w-full overflow-y-auto px-3.5 pt-[var(--pad-chat)] pb-[84px] flex flex-col gap-1.5"
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-ink" />
            <span className="text-xs font-medium">Loading messages…</span>
          </div>
        ) : (
          <>
            {loadingOlder && (
              <div className="flex justify-center py-2 text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-ink" />
              </div>
            )}

            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted my-auto"
              >
                <div className="w-14 h-14 rounded-2xl bg-field flex items-center justify-center text-ink font-bold text-2xl mb-3 shadow-neu-raised">
                  💬
                </div>
                <h3 className="font-display text-xl text-ink mb-1 tracking-wide">Connect on Linksy</h3>
                <p className="text-xs max-w-xs text-muted leading-relaxed">
                  Send a message to begin your secure private conversation.
                </p>
              </motion.div>
            )}

            {renderMessageList()}

            {/* Realtime Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-1 p-2 self-start" aria-label="typing">
                <span className="w-1.5 h-1.5 rounded-full bg-ink animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-ink animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-ink animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Wave Composer */}
      <WaveComposer
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        disabled={loading || !conversation}
      />

      {/* Image inspection modal */}
      <ImageModal
        imageUrl={enlargedImageUrl}
        onClose={() => setEnlargedImageUrl(null)}
      />
    </div>
  );
};
