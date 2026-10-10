import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../context/PresenceContext';
import type { Conversation } from '../types/database';
import { Tide } from '../components/Tide';
import { UserAvatar } from '../components/UserAvatar';
import { ProfileModal } from '../components/ProfileModal';
import { UserDirectory } from './UserDirectory';
import { AdminUsers } from './AdminUsers';
import { AdminUnsentLog } from './AdminUnsentLog';
import { ChatScreen } from './ChatScreen';
import { ThemeToggle } from '../components/ThemeToggle';
import { UISwitchButton } from '../components/UISwitchButton';
import {
  Search,
  MessageSquare,
  Users,
  Compass,
  FileText,
  Loader2,
  Bell,
  BellOff,
  UserPlus,
} from 'lucide-react';
import { formatShortTime, getDisplayName } from '../lib/utils';
import {
  sendLinksyNotification,
  requestNotificationPermission,
  isNotificationSupported,
  getNotificationPermission,
} from '../lib/notifications';

type TabType = 'chats' | 'discover' | 'users' | 'unsent';

interface InboxScreenProps {
  initialConversationId?: string | null;
}

export const InboxScreen: React.FC<InboxScreenProps> = ({ initialConversationId }) => {
  const { user, profile, isAdmin } = useAuth();
  const { isUserOnline } = usePresence();
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<{ id: string; username: string } | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(getNotificationPermission());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // 1. Initial Conversation selection from props or URL
  useEffect(() => {
    if (initialConversationId) {
      setSelectedConv({ id: initialConversationId, username: 'Chat' });
    }
  }, [initialConversationId]);

  // 2. Notification Toggle with iOS Home Screen handling
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

  // 3. Fetch all conversations where current user is a participant
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Query conversations where user is user_id, recipient_id, or admin_id
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          user:profiles!conversations_user_id_fkey(*),
          recipient:profiles!conversations_recipient_id_fkey(*),
          admin:profiles!conversations_admin_id_fkey(*)
        `)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      const convList = (convData as unknown as Conversation[]) || [];

      // Enrich with last message and unread count
      const enriched = await Promise.all(
        convList.map(async (conv) => {
          // Identify the other participant
          const isOwnerOfConv = conv.user_id === user.id;
          const otherProfile = isOwnerOfConv
            ? conv.recipient || conv.admin
            : conv.user;

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
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            ...conv,
            other_user: otherProfile,
            last_message: msgData ?? null,
            unread_count: unreadCount ?? 0,
          };
        })
      );

      setConversations(enriched);
    } catch (err) {
      console.warn('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 4. Real-time subscription across messages & conversations
  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('linksy-inbox-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          fetchConversations();
          if (payload.eventType === 'INSERT') {
            const msg = payload.new as {
              sender_id?: string;
              type?: string;
              body?: string;
              conversation_id?: string;
            };

            // Trigger notification if message is from another user and not currently inside that chat
            if (msg && msg.sender_id !== user?.id) {
              const isCurrentlyViewing = selectedConv?.id === msg.conversation_id && !document.hidden;
              if (!isCurrentlyViewing) {
                sendLinksyNotification({
                  senderName: 'New message',
                  preview:
                    msg.type === 'image'
                      ? '📷 Sent a photo'
                      : msg.body
                      ? msg.body.length > 50
                        ? msg.body.slice(0, 50) + '...'
                        : msg.body
                      : 'Sent a message',
                  conversationId: msg.conversation_id,
                });
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchConversations, user?.id, selectedConv?.id]);

  // Handle scroll progress for liquid wave
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

  // Filter conversations by partner's username or display name
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter((c) => {
      const partner = c.other_user;
      const usernameMatch = partner?.username?.toLowerCase().includes(q);
      const displayNameMatch = partner?.display_name?.toLowerCase().includes(q);
      return Boolean(usernameMatch || displayNameMatch);
    });
  }, [conversations, searchQuery]);

  // Open Chat Screen if a conversation is selected
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
      {/* Top Tide Liquid Wave Header */}
      <Tide screen="admin" scrollProgress={scrollProgress}>
        <div className="absolute left-4 right-4 top-3 flex flex-col">
          {/* Top row: Profile Avatar, Title, Actions */}
          <div className="flex items-center justify-between h-11">
            <div className="flex items-center gap-2.5">
              {/* User Avatar Button (Opens Profile Modal) */}
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="relative group cursor-pointer focus:outline-none"
                title="Edit your profile"
                aria-label="Edit your profile"
              >
                <UserAvatar
                  profile={profile}
                  size="sm"
                  className="ring-2 ring-white/30 hover:ring-white transition-all"
                />
              </button>

              <div className="flex flex-col">
                <h1
                  className="font-display font-normal text-[26px] leading-none text-white tracking-wide origin-left transition-transform duration-100"
                  style={{ transform: `scale(${1 - 0.12 * scrollProgress})` }}
                >
                  Linksy
                </h1>
                <span className="text-[10px] text-white/70 font-medium tracking-tight">
                  by FRZI TOOLS
                </span>
              </div>
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-1.5">
              {/* Notification Toggle */}
              {isNotificationSupported() && (
                <button
                  type="button"
                  onClick={handleToggleNotification}
                  title={notifPerm === 'granted' ? 'Notifications Enabled' : 'Enable Push Notifications'}
                  aria-label={notifPerm === 'granted' ? 'Notifications Enabled' : 'Enable Push Notifications'}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-all flex-shrink-0 cursor-pointer"
                >
                  {notifPerm === 'granted' ? (
                    <Bell className="w-4 h-4 text-emerald-300 stroke-[2.2]" />
                  ) : (
                    <BellOff className="w-4 h-4 text-white/70 stroke-[2]" />
                  )}
                </button>
              )}

              {/* Discover New Chat Icon */}
              <button
                type="button"
                onClick={() => setActiveTab('discover')}
                title="Find users & start chat"
                aria-label="Find users & start chat"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                  activeTab === 'discover'
                    ? 'bg-white text-ink shadow-neu-pill'
                    : 'text-white hover:bg-white/15'
                }`}
              >
                <UserPlus className="w-4 h-4" />
              </button>

              <UISwitchButton />
              <ThemeToggle />
            </div>
          </div>

          {/* Search bar for Chats tab */}
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
                placeholder="Search conversations..."
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
        {/* TAB 1: CHATS */}
        {activeTab === 'chats' && (
          <div className="flex-1 w-full px-3.5 flex flex-col">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-ink" />
                <span className="text-xs font-medium">Loading conversations…</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-3 text-muted text-xs font-medium">
                <MessageSquare className="w-8 h-8 stroke-[1.5] text-muted/50" />
                <span>{searchQuery ? 'No chats match your search.' : 'No conversations yet.'}</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('discover')}
                  className="px-4 py-2 rounded-xl bg-btn text-btn-ink text-xs font-semibold flex items-center gap-1.5 shadow-neu-float hover:opacity-90 transition-all cursor-pointer mt-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Discover People & Chat</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredConversations.map((conv) => {
                  const partner = conv.other_user;
                  const partnerUsername = partner?.username ?? 'User';
                  const partnerDisplayName = getDisplayName(partner);
                  const isOnline = partner ? isUserOnline(partner.id) : false;
                  const lastMsg = conv.last_message;
                  const lastText = lastMsg
                    ? lastMsg.type === 'image'
                      ? lastMsg.is_one_time
                        ? '📷 View once photo'
                        : '📷 Photo'
                      : lastMsg.body
                    : 'No messages yet';
                  const timeStr = lastMsg ? formatShortTime(lastMsg.created_at) : '';
                  const unread = conv.unread_count ?? 0;

                  return (
                    <motion.div
                      key={conv.id}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        setSelectedConv({
                          id: conv.id,
                          username: partnerUsername,
                        })
                      }
                      className="flex items-center gap-3 p-3 rounded-2xl bg-field/60 shadow-neu-flat hover:shadow-neu-raised cursor-pointer transition-all border border-line/30 select-none"
                    >
                      {/* Avatar with status indicator */}
                      <UserAvatar
                        profile={partner}
                        size="md"
                        isOnline={isOnline}
                        showOnlineStatus
                      />

                      {/* Chat info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5">
                          <b className="font-heading font-bold text-[14px] text-ink truncate leading-tight">
                            {partnerDisplayName}
                          </b>
                          {isOnline && (
                            <span className="text-[10px] text-emerald-500 font-semibold">online</span>
                          )}
                        </div>
                        <p className="text-[12px] text-muted truncate mt-0.5 leading-tight">
                          {lastText}
                        </p>
                      </div>

                      {/* Timestamp & Unread Badge */}
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

        {/* TAB 2: DISCOVER / USER DIRECTORY */}
        {activeTab === 'discover' && (
          <UserDirectory
            onStartChat={(convId, username) => {
              setSelectedConv({ id: convId, username });
              fetchConversations();
            }}
          />
        )}

        {/* ADMIN TABS: USERS & UNSENT LOG */}
        {isAdmin && activeTab === 'users' && <AdminUsers />}
        {isAdmin && activeTab === 'unsent' && <AdminUnsentLog />}
      </div>

      {/* Floating Bottom Tab Bar */}
      <div className="absolute bottom-3 left-4 right-4 z-30 h-[50px] rounded-full bg-field shadow-neu-float border border-line/30 flex items-center p-1 select-none">
        {/* Chats Tab */}
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
              layoutId="inbox-tab-pill"
              className="absolute inset-0 bg-btn rounded-full -z-10 shadow-neu-flat"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>

        {/* Discover / Users Directory Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('discover')}
          className={`relative flex-1 h-full rounded-full flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors z-10 cursor-pointer ${
            activeTab === 'discover' ? 'text-btn-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Discover</span>
          {activeTab === 'discover' && (
            <motion.div
              layoutId="inbox-tab-pill"
              className="absolute inset-0 bg-btn rounded-full -z-10 shadow-neu-flat"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>

        {/* Admin Tabs */}
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`relative flex-1 h-full rounded-full flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors z-10 cursor-pointer ${
                activeTab === 'users' ? 'text-btn-ink' : 'text-muted hover:text-ink'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Admin</span>
              {activeTab === 'users' && (
                <motion.div
                  layoutId="inbox-tab-pill"
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
              <span>Audit</span>
              {activeTab === 'unsent' && (
                <motion.div
                  layoutId="inbox-tab-pill"
                  className="absolute inset-0 bg-btn rounded-full -z-10 shadow-neu-flat"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          </>
        )}
      </div>

      {/* User Profile Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          fetchConversations();
        }}
      />
    </div>
  );
};
