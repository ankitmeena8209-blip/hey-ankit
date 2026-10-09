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
import { GlassBackground } from '../components/GlassBackground';
import { Search, MessageSquare, Users, FileText, Loader2 } from 'lucide-react';
import { getInitials, formatShortTime } from '../lib/utils';

type AdminTab = 'chats' | 'users' | 'unsent';

export const AdminInbox: React.FC = () => {
  const { logout } = useAuth();
  const { isUserOnline } = usePresence();
  const [activeTab, setActiveTab] = useState<AdminTab>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<{ id: string; username: string } | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

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
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchConversations]);

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
    <div className="relative h-dvh w-full max-w-md mx-auto flex flex-col justify-between overflow-hidden select-none" data-s="admin">
      {/* Dynamic Glass Ambient Orbs & Veil */}
      <GlassBackground screen="admin" />

      {/* Top Tide Header with Dynamic Scroll Link */}
      <Tide screen="admin" scrollProgress={scrollProgress}>
        <div className="absolute left-4 right-3.5 top-3.5 flex flex-col z-20">
          {/* Top row: Title, ThemeToggle and Log out */}
          <div className="trow flex items-center gap-2 h-11">
            <h2
              className="d flex-1 text-[24px] sm:text-[26px] font-bold text-white tracking-tight origin-left transition-transform duration-100"
              style={{ transform: `scale(${1 - 0.15 * scrollProgress})` }}
            >
              Friends
            </h2>
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="lo hit h-[34px] px-3.5 rounded-[17px] border border-white/40 text-white text-[12px] font-bold hover:bg-white/15 transition-all flex-shrink-0 select-none flex items-center justify-center cursor-pointer"
            >
              Log out
            </button>
          </div>

          {/* Search bar (folds away smoothly on scroll) */}
          {activeTab === 'chats' && (
            <div
              className="sch relative flex items-center overflow-hidden transition-all"
              style={{
                height: `${38 * Math.max(0, 1 - scrollProgress)}px`,
                opacity: Math.max(0, 1 - scrollProgress * 1.5),
                marginTop: `${8 * Math.max(0, 1 - scrollProgress)}px`,
              }}
            >
              <Search className="absolute left-3 w-4 h-4 text-white/80 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[38px] rounded-[12px] bg-white/15 text-white placeholder:text-white/70 pl-9 pr-3 text-xs font-medium outline-none border border-white/30 transition-all"
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
              <div className="flex flex-col gap-1.5">
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
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConv({ id: conv.id, username: friendUsername })}
                      className="lst flex items-center gap-3 p-2.5 rounded-[15px] hover:bg-glass transition-all cursor-pointer select-none"
                    >
                      {/* Avatar with live status indicator */}
                      <div className="av relative w-[38px] h-[38px] rounded-full text-white font-display text-[15px] flex items-center justify-center flex-shrink-0">
                        {getInitials(friendUsername)}
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-base1 ${
                            isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'
                          }`}
                        />
                      </div>

                      {/* Message info */}
                      <div className="m flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5">
                          <b className="text-[14px] text-ink font-bold truncate leading-tight">
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
                      <div className="e flex flex-col items-end gap-1 flex-shrink-0 text-[11px] text-muted font-medium">
                        {timeStr && <span>{timeStr}</span>}
                        {unread > 0 && (
                          <span className="bd2 text-white rounded-[9px] min-w-[18px] px-1.5 py-0.5 text-[11px] font-bold text-center">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'unsent' && <AdminUnsentLog />}
      </div>

      {/* Floating Bottom Tab Bar with Glass Mask */}
      <div className="tabs pop absolute bottom-3 left-5 right-5 z-30 h-[46px] rounded-[23px] bg-glass border border-gb backdrop-blur-xl shadow-lg flex items-center p-1 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('chats')}
          className={`relative flex-1 h-full rounded-[19px] flex items-center justify-center gap-1.5 text-[12px] font-bold transition-colors z-10 cursor-pointer ${
            activeTab === 'chats' ? 'text-white' : 'text-muted hover:text-ink'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chats</span>
          {activeTab === 'chats' && (
            <motion.div
              layoutId="admin-glass-tab"
              className="absolute inset-0 btn-sent rounded-[19px] -z-10 shadow-md"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`relative flex-1 h-full rounded-[19px] flex items-center justify-center gap-1.5 text-[12px] font-bold transition-colors z-10 cursor-pointer ${
            activeTab === 'users' ? 'text-white' : 'text-muted hover:text-ink'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users</span>
          {activeTab === 'users' && (
            <motion.div
              layoutId="admin-glass-tab"
              className="absolute inset-0 btn-sent rounded-[19px] -z-10 shadow-md"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('unsent')}
          className={`relative flex-1 h-full rounded-[19px] flex items-center justify-center gap-1.5 text-[12px] font-bold transition-colors z-10 cursor-pointer ${
            activeTab === 'unsent' ? 'text-white' : 'text-muted hover:text-ink'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Unsent</span>
          {activeTab === 'unsent' && (
            <motion.div
              layoutId="admin-glass-tab"
              className="absolute inset-0 btn-sent rounded-[19px] -z-10 shadow-md"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>
      </div>
    </div>
  );
};

