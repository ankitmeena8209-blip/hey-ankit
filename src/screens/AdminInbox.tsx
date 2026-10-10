import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../context/PresenceContext';
import type { Conversation } from '../types/database';
import { Tide } from '../components/Tide';
import { AdminUsers } from './AdminUsers';
import { AdminUnsentLog } from './AdminUnsentLog';
import { ChatScreen } from './ChatScreen';
import { ThemeToggle } from '../components/ThemeToggle';
import { Search, MessageSquare, Users, FileText, Loader2, Bell, BellOff } from 'lucide-react';
import { getInitials, formatShortTime } from '../lib/utils';
import {
  sendHeyAnkitNotification,
  requestNotificationPermission,
  isNotificationSupported,
  getNotificationPermission,
} from '../lib/notifications';

type AdminTab = 'chats' | 'users' | 'unsent';

export const AdminInbox: React.FC = () => {
  const { user, logout } = useAuth();
  const { isUserOnline } = usePresence();
  const [activeTab, setActiveTab] = useState<AdminTab>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<{ id: string; username: string } | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(getNotificationPermission());

  const handleToggleNotification = async () => {
    if (notifPerm === 'granted') {
      sendHeyAnkitNotification({
        senderName: 'Linksy',
        preview: 'Branded notifications are active!',
      });
      return;
    }
    const { permission } = await requestNotificationPermission();
    setNotifPerm(permission);
    if (permission === 'granted') {
      sendHeyAnkitNotification({
        senderName: 'Linksy',
        preview: 'Branded notifications enabled!',
      });
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          user:profiles!conversations_user_id_fkey(*)
        `)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      const convList = (convData as Conversation[]) || [];

      const enriched = await Promise.all(
        convList.map(async (conv) => {
          const { data: msgData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_id', conv.user_id)
            .is('read_at', null);

          return {
            ...conv,
            last_message: msgData ?? null,
            unread_count: unreadCount ?? 0,
          };
        })
      );

      setConversations(enriched);
    } catch (err) {
      console.error('Error fetching admin inbox conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('admin-inbox-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          fetchConversations();
          if (payload.eventType === 'INSERT') {
            const msg = payload.new as { sender_id?: string; type?: string; body?: string };
            if (document.hidden && msg && msg.sender_id !== user?.id) {
              sendHeyAnkitNotification({
                senderName: 'Friend',
                preview:
                  msg.type === 'image'
                    ? '📷 Sent a photo'
                    : msg.body
                    ? msg.body.length > 50
                      ? msg.body.slice(0, 50) + '...'
                      : msg.body
                    : 'Sent a new message',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchConversations, user?.id]);

  const rafRef = useRef<number | null>(null);

  const handleScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollContainerRef.current;
      if (!el) return;
      const prog = Math.min(el.scrollTop / 90, 1);
      setScrollProgress(prog);
    });
  };

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((c) =>
      c.user?.username?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  if (selectedConv) {
    return (
      <ChatScreen
        conversationId={selectedConv.id}
        partnerUsername={selectedConv.username}
        onBack={() => {
          setSelectedConv(null);
          fetchConversations();
        }}
      />
    );
  }

  return (
    <div className="relative h-dvh w-full max-w-md mx-auto bg-surface flex flex-col justify-between overflow-hidden select-none">
      {/* Top Tide Header with Dynamic Scroll Link */}
      <Tide screen="admin" scrollProgress={scrollProgress}>
        <div className="absolute left-4 right-4 top-3 flex flex-col">
          {/* Top row: Title, ThemeToggle and Log out */}
          <div className="flex items-center justify-between h-11">
            <div className="flex items-center">
              <h2
                className="font-display font-normal text-[28px] leading-none text-white tracking-wide origin-left transition-transform duration-100"
                style={{ transform: `scale(${1 - 0.15 * scrollProgress})` }}
              >
                Friends
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {isNotificationSupported() && (
                <button
                  type="button"
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
                </button>
              )}
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                className="h-9 px-3.5 rounded-full border border-white/40 text-white text-xs font-semibold hover:bg-white/15 transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer"
              >
                Log out
              </button>
            </div>
          </div>

          {/* Search bar (folds away smoothly on scroll) */}
          {activeTab === 'chats' && (
            <div
              className="relative mt-2 transition-all overflow-hidden flex items-center"
              style={{
                height: `${38 * Math.max(0, 1 - scrollProgress)}px`,
                opacity: Math.max(0, 1 - scrollProgress * 1.5),
              }}
            >
              <Search className="absolute left-3 w-4 h-4 text-muted pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 rounded-xl bg-surface text-ink pl-9 pr-3 text-xs font-medium outline-none shadow-neu-inset border border-line/30"
              />
            </div>
          )}
        </div>
      </Tide>

      {/* Main Tab Content */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col pt-[156px] pb-[80px]"
      >
        {activeTab === 'chats' && (
          <div className="flex-1 w-full px-3.5 flex flex-col">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-ink" />
                <span className="text-xs font-medium">Loading conversations…</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-muted text-xs font-medium">
                {searchQuery ? 'No friends match your search.' : 'No conversations yet.'}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredConversations.map((conv) => {
                  const friendUsername = conv.user?.username ?? 'Friend';
                  const isOnline = isUserOnline(conv.user_id);
                  const lastMsg = conv.last_message;
                  const lastText = lastMsg
                    ? lastMsg.type === 'image'
                      ? lastMsg.is_one_time ? '📷 View once photo' : '📷 Photo'
                      : lastMsg.body
                    : 'No messages yet';
                  const timeStr = lastMsg ? formatShortTime(lastMsg.created_at) : '';
                  const unread = conv.unread_count ?? 0;

                  return (
                    <motion.div
                      key={conv.id}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedConv({ id: conv.id, username: friendUsername })}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-field/60 shadow-neu-flat hover:shadow-neu-raised cursor-pointer transition-all border border-line/30 select-none"
                    >
                      {/* Avatar with online status */}
                      <div className="relative w-10 h-10 rounded-full bg-btn text-btn-ink font-display text-[17px] flex items-center justify-center flex-shrink-0 shadow-neu-raised">
                        {getInitials(friendUsername)}
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${
                            isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>

                      {/* Message info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5">
                          <b className="font-heading font-bold text-[14px] text-ink truncate leading-tight">
                            {friendUsername}
                          </b>
                          {isOnline && (
                            <span className="text-[10px] text-emerald-500 font-semibold">online</span>
                          )}
                        </div>
                        <p className="text-[12px] text-muted truncate mt-0.5 leading-tight">
                          {lastText}
                        </p>
                      </div>

                      {/* Time and Unread Badge */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 text-xs text-muted font-medium">
                        {timeStr && <span className="text-[10.5px]">{timeStr}</span>}
                        {unread > 0 && (
                          <span className="bg-badge text-badge-ink rounded-full min-w-[18px] px-1.5 py-0.5 text-[10.5px] font-bold text-center shadow-neu-pill">
                            {unread}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'unsent' && <AdminUnsentLog />}
      </div>

      {/* Floating Bottom Tab Bar */}
      <div className="absolute bottom-3 left-4 right-4 z-30 h-[50px] rounded-full bg-field shadow-neu-float border border-line/30 flex items-center p-1 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('chats')}
          className={`relative flex-1 h-full rounded-full flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors z-10 cursor-pointer ${
            activeTab === 'chats' ? 'text-btn-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chats</span>
          {activeTab === 'chats' && (
            <motion.div
              layoutId="admin-tab-pill"
              className="absolute inset-0 bg-btn rounded-full -z-10 shadow-neu-flat"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`relative flex-1 h-full rounded-full flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors z-10 cursor-pointer ${
            activeTab === 'users' ? 'text-btn-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users</span>
          {activeTab === 'users' && (
            <motion.div
              layoutId="admin-tab-pill"
              className="absolute inset-0 bg-btn rounded-full -z-10 shadow-neu-flat"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('unsent')}
          className={`relative flex-1 h-full rounded-full flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors z-10 cursor-pointer ${
            activeTab === 'unsent' ? 'text-btn-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Unsent</span>
          {activeTab === 'unsent' && (
            <motion.div
              layoutId="admin-tab-pill"
              className="absolute inset-0 bg-btn rounded-full -z-10 shadow-neu-flat"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>
      </div>
    </div>
  );
};
