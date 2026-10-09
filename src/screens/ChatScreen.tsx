import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../context/PresenceContext';
import type { Message, Conversation } from '../types/database';
import { Tide } from '../components/Tide';
import { WaveComposer } from '../components/WaveComposer';
import { MessageBubble } from '../components/MessageBubble';
import { ImageModal } from '../components/ImageModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { GlassBackground } from '../components/GlassBackground';
import { formatChatDate, getInitials } from '../lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';

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
  const { user, profile, isAdmin, logout } = useAuth();
  const { isUserOnline } = usePresence();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // 1. Resolve or create conversation
  useEffect(() => {
    let isMounted = true;

    async function initConversation() {
      setLoading(true);
      try {
        if (propConversationId) {
          const { data, error } = await supabase
            .from('conversations')
            .select('*, user:profiles!conversations_user_id_fkey(*)')
            .eq('id', propConversationId)
            .single();

          if (!error && data && isMounted) {
            setConversation(data as Conversation);
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
  }, [propConversationId]);

  const partnerId = isAdmin ? conversation?.user_id : conversation?.admin_id;
  const isPartnerOnline = partnerId ? isUserOnline(partnerId) : false;

  const partnerName = propPartnerUsername
    ? propPartnerUsername
    : isAdmin
    ? conversation?.user?.username ?? 'Friend'
    : 'Ankit';

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
  }, [conversation?.id, loadMessages, markRead, user?.id]);

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
      is_one_time: imagePayload?.isOneTime ?? false,
      viewed_by: [],
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
          <div key={`date-${msg.id}`} className="day self-center my-2 select-none">
            {dateStr}
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
    <div className="relative h-dvh w-full max-w-md mx-auto flex flex-col justify-between overflow-hidden select-none" data-s="chat">
      {/* Dynamic Glass Ambient Orbs & Veil */}
      <GlassBackground screen="chat" />

      {/* Top Tide Header with Scroll Link */}
      <Tide screen="chat" scrollProgress={scrollProgress}>
        <div className="absolute left-3 right-3 top-3.5 flex items-center gap-2.5 h-11 z-20">
          {isAdmin && onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to inbox"
              className="ib hit w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-all flex-shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
            </button>
          )}

          {/* Avatar */}
          <div className="av relative w-[36px] h-[36px] rounded-full text-white flex items-center justify-center font-display font-semibold text-[15px] flex-shrink-0">
            {getInitials(partnerName)}
            {/* Realtime Active status pulse dot */}
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-base1 ${
                isPartnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'
              }`}
            />
          </div>

          {/* Name & Realtime Status */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <b
              className="font-display font-semibold text-[16px] leading-tight text-white truncate origin-left transition-transform duration-100"
              style={{ transform: `scale(${1 - 0.08 * scrollProgress})` }}
            >
              {partnerName}
            </b>
            <div className="flex items-center gap-1.5 min-h-[14px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isTyping
                    ? 'bg-acc animate-ping'
                    : isPartnerOnline
                    ? 'bg-emerald-400'
                    : 'bg-white/40'
                }`}
              />
              <small className="text-[12px] text-white/80 block truncate leading-tight font-medium">
                {isTyping ? 'typing…' : isPartnerOnline ? 'Active now' : 'Offline'}
              </small>
            </div>
          </div>

          {/* Sun / Moon Theme Toggle */}
          <ThemeToggle />

          {/* Outlined Log out Pill */}
          <button
            type="button"
            onClick={logout}
            className="lo hit h-[34px] px-3.5 rounded-[17px] border border-white/40 text-white text-[12px] font-bold hover:bg-white/15 transition-all flex-shrink-0 select-none flex items-center justify-center cursor-pointer"
          >
            Log out
          </button>
        </div>
      </Tide>

      {/* Main chat body (scrolls under the tide) */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 w-full overflow-y-auto px-3.5 pt-[104px] pb-[80px] flex flex-col gap-1.5"
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
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted my-auto">
                <div className="w-14 h-14 rounded-full bg-glass border border-gb flex items-center justify-center text-ink font-bold text-2xl mb-3 shadow-md">
                  ✨
                </div>
                <h3 className="font-display text-xl text-ink mb-1 font-bold">Hey {partnerName}!</h3>
                <p className="text-xs max-w-xs text-muted leading-relaxed">
                  Start your private, encrypted 1:1 conversation.
                </p>
              </div>
            )}

            {renderMessageList()}

            {/* Realtime Typing Indicator */}
            {isTyping && (
              <div className="dots on flex items-center gap-1 p-2 self-start" aria-label="typing">
                <i />
                <i />
                <i />
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

