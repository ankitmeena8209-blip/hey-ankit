import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Conversation } from '../types/database';
import { WaveHeader } from '../components/WaveHeader';
import { AdminUsers } from './AdminUsers';
import { AdminUnsentLog } from './AdminUnsentLog';
import { ChatScreen } from './ChatScreen';
import { Search, MessageSquare, Users, FileText, Loader2 } from 'lucide-react';
import { getInitials, formatShortTime } from '../lib/utils';

type AdminTab = 'chats' | 'users' | 'unsent';

export const AdminInbox: React.FC = () => {
  const { logout, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<{ id: string; username: string } | null>(null);

  // Fetch all conversations with joined user profiles and latest messages
  const fetchConversations = useCallback(async () => {
    try {
      // 1. Fetch conversations with user profile
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          user:profiles!conversations_user_id_fkey(*)
        `)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      const convList = (convData as Conversation[]) || [];

      // 2. Fetch latest message and unread count for each conversation
      const enriched = await Promise.all(
        convList.map(async (conv) => {
          // Latest message
          const { data: msgData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Count unread messages sent by the user
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

    // Listen to messages table in realtime to refresh inbox preview & unread badges
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

  // Filter conversations by username search
  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((c) =>
      c.user?.username?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // If a conversation is selected by admin, render ChatScreen with back button
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
    <div className="h-dvh w-full flex flex-col bg-page select-none overflow-hidden">
      {/* Header */}
      <WaveHeader
        title={activeTab === 'chats' ? 'Friends' : activeTab === 'users' ? 'Manage Users' : 'Audit Log'}
        subtitle={`Admin (@${profile?.username || 'being_frzi'})`}
        onLogout={logout}
      />

      {/* Main Tab Content */}
      <div className="flex-1 w-full overflow-hidden flex flex-col">
        {activeTab === 'chats' && (
          <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col px-3 sm:px-6 py-2 overflow-hidden">
            {/* Search Input */}
            <div className="relative mb-3 flex-shrink-0">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface text-ink rounded-2xl pl-10 pr-4 py-2.5 text-sm border border-line outline-none focus:ring-2 focus:ring-g2 transition-all placeholder:text-muted/60 shadow-sm"
              />
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pb-20">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted px-2 py-1">
                Recent
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-g1" />
                  <span className="text-xs">Loading conversations...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-muted text-xs">
                  {searchQuery ? 'No friends match your search.' : 'No conversations yet.'}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const friendUsername = conv.user?.username ?? 'Friend';
                  const lastMsg = conv.last_message;
                  const lastText = lastMsg
                    ? lastMsg.type === 'image'
                      ? '📷 Photo'
                      : lastMsg.body
                    : 'No messages yet';
                  const timeStr = lastMsg ? formatShortTime(lastMsg.created_at) : '';
                  const unread = conv.unread_count ?? 0;

                  return (
                    <motion.div
                      key={conv.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedConv({ id: conv.id, username: friendUsername })}
                      className="bg-surface rounded-2xl p-3.5 border border-line shadow-sm hover:border-g2/50 cursor-pointer flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar Initial */}
                        <div className="w-11 h-11 rounded-full bg-g2/20 border border-g2/30 flex items-center justify-center text-g1 font-bold text-base flex-shrink-0 shadow-inner">
                          {getInitials(friendUsername)}
                        </div>

                        {/* Text info */}
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm text-ink truncate leading-tight">
                            {friendUsername}
                          </span>
                          <span className="text-xs text-muted truncate mt-0.5 leading-tight">
                            {lastText}
                          </span>
                        </div>
                      </div>

                      {/* Right meta: timestamp & unread badge */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {timeStr && (
                          <span className="text-[11px] text-muted font-medium">
                            {timeStr}
                          </span>
                        )}
                        {unread > 0 && (
                          <span className="px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-badge text-white text-[10px] font-bold shadow-sm">
                            {unread}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'unsent' && <AdminUnsentLog />}
      </div>

      {/* Bottom Tabs with Sliding Framer Motion Indicator */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line safe-pb shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around px-4 py-2">
          {/* Tab 1: Chats */}
          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className={`touch-target relative flex flex-col items-center justify-center px-4 py-1 text-xs font-semibold transition-colors ${
              activeTab === 'chats' ? 'text-g1' : 'text-muted hover:text-ink'
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span>Chats</span>
            {activeTab === 'chats' && (
              <motion.div
                layoutId="admin-active-tab"
                className="absolute -bottom-1 w-6 h-1 rounded-full bg-g1"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>

          {/* Tab 2: Users */}
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`touch-target relative flex flex-col items-center justify-center px-4 py-1 text-xs font-semibold transition-colors ${
              activeTab === 'users' ? 'text-g1' : 'text-muted hover:text-ink'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Users</span>
            {activeTab === 'users' && (
              <motion.div
                layoutId="admin-active-tab"
                className="absolute -bottom-1 w-6 h-1 rounded-full bg-g1"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>

          {/* Tab 3: Unsent log */}
          <button
            type="button"
            onClick={() => setActiveTab('unsent')}
            className={`touch-target relative flex flex-col items-center justify-center px-4 py-1 text-xs font-semibold transition-colors ${
              activeTab === 'unsent' ? 'text-g1' : 'text-muted hover:text-ink'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span>Unsent log</span>
            {activeTab === 'unsent' && (
              <motion.div
                layoutId="admin-active-tab"
                className="absolute -bottom-1 w-6 h-1 rounded-full bg-g1"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
