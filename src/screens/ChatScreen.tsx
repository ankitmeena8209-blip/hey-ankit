import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Message, Conversation } from '../types/database';
import { WaveHeader } from '../components/WaveHeader';
import { WaveComposer } from '../components/WaveComposer';
import { MessageBubble } from '../components/MessageBubble';
import { ImageModal } from '../components/ImageModal';
import { formatChatDate } from '../lib/utils';
import { Loader2 } from 'lucide-react';

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
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);

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
          // Admin viewing specific conversation
          const { data, error } = await supabase
            .from('conversations')
            .select('*, user:profiles!conversations_user_id_fkey(*)')
            .eq('id', propConversationId)
            .single();

          if (!error && data && isMounted) {
            setConversation(data as Conversation);
          }
        } else {
          // Regular user: get or create own 1:1 conversation with admin
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

  // Determine chat partner name
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

  // 3. Load initial latest 30 messages
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
        // Reverse array so messages render chronologically (oldest to newest)
        const sorted = (data as Message[]).reverse();
        setMessages(sorted);
        setHasMore(data.length === PAGE_SIZE);
        // Scroll to bottom after loading initial
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

  // 4. Load older messages (scroll up pagination without scroll yank)
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

        // Preserve scroll position so user experience is smooth
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

  // 5. Setup Realtime subscription and broadcast channel
  useEffect(() => {
    if (!conversation?.id) return;
    const convId = conversation.id;

    loadMessages(convId);
    markRead(convId);

    // Channel for postgres_changes + typing broadcast
    const channel = supabase
      .channel(`chat:${convId}`)
      // Realtime DB changes on messages
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
              // Deduplicate by message id
              if (prev.some((m) => m.id === newMsg.id)) {
                return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
              }
              return [...prev, newMsg];
            });

            // If user is currently near bottom, scroll down
            if (isNearBottomRef.current) {
              setTimeout(() => {
                if (messagesContainerRef.current) {
                  messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
              }, 60);
            }

            // Mark read if incoming from other user
            if (newMsg.sender_id !== user?.id) {
              markRead(convId);
              // Clear typing indicator
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
      // Broadcast typing channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { senderId } = payload.payload || {};
        if (senderId && senderId !== user?.id) {
          setIsTyping(true);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          // Auto clear typing state after 20s idle
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 20000);
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

  // Track if user is scrolled near bottom
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const threshold = 120;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    isNearBottomRef.current = isBottom;

    if (el.scrollTop <= 20 && hasMore && !loadingOlder) {
      loadOlderMessages();
    }
  };

  // Broadcast typing
  const handleTyping = () => {
    if (!channelRef.current || !user?.id) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { senderId: user.id, username: profile?.username },
    });
  };

  // Send message
  const handleSendMessage = async (
    text: string,
    imagePayload?: { blob: Blob; ext: string }
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

      if (uploadError) {
        throw uploadError;
      }

      imagePath = path;
    }

    const { error: insertError } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      type: imagePath ? 'image' : 'text',
      body: text || null,
      image_path: imagePath,
    });

    if (insertError) {
      throw insertError;
    }
  };

  // Edit message
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

  // Unsend message
  const handleUnsendMessage = async (messageId: string) => {
    const { error } = await supabase.rpc('unsend_message', {
      p_message_id: messageId,
    });
    if (error) {
      alert(`Unsend failed: ${error.message}`);
      throw error;
    }
  };

  // Group messages by date
  const renderMessageList = () => {
    const elements: React.ReactNode[] = [];
    let lastDateStr = '';

    messages.forEach((msg) => {
      const dateStr = formatChatDate(msg.created_at);
      if (dateStr && dateStr !== lastDateStr) {
        lastDateStr = dateStr;
        elements.push(
          <div key={`date-${msg.id}`} className="flex justify-center my-3 select-none">
            <span className="px-3 py-1 rounded-full bg-black/10 dark:bg-white/10 text-ink/75 text-[11.5px] font-medium tracking-wide">
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
        />
      );
    });

    return elements;
  };

  return (
    <div className="h-dvh w-full flex flex-col bg-page select-none overflow-hidden">
      {/* Wave Header */}
      <WaveHeader
        title={partnerName}
        subtitle={isTyping ? undefined : 'online'}
        isTyping={isTyping}
        onBack={isAdmin ? onBack : undefined}
        onLogout={logout}
        avatarInitial={partnerName}
      />

      {/* Main chat messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-2 overflow-y-auto flex flex-col justify-start"
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-g1" />
            <span className="text-xs">Loading conversation...</span>
          </div>
        ) : (
          <>
            {/* Loading older spinner */}
            {loadingOlder && (
              <div className="flex justify-center py-2 text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-g1" />
              </div>
            )}

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-g1 font-bold text-xl mb-3 shadow-inner">
                  💬
                </div>
                <h3 className="font-bold text-base text-ink mb-1">Say hello!</h3>
                <p className="text-xs max-w-xs text-muted">
                  Send your first message to begin this private 1:1 conversation.
                </p>
              </div>
            )}

            {renderMessageList()}
          </>
        )}
      </div>

      {/* Wave Composer */}
      <WaveComposer
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        disabled={loading || !conversation}
      />

      {/* Fullscreen image inspection modal */}
      <ImageModal
        imageUrl={enlargedImageUrl}
        onClose={() => setEnlargedImageUrl(null)}
      />
    </div>
  );
};
