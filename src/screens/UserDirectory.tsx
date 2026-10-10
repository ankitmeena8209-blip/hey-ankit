import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../context/PresenceContext';
import type { Profile } from '../types/database';
import { UserAvatar } from '../components/UserAvatar';
import { getDisplayName } from '../lib/utils';
import { Search, MessageSquare, Loader2, ShieldCheck, UserPlus } from 'lucide-react';

interface UserDirectoryProps {
  onStartChat: (conversationId: string, partnerUsername: string) => void;
}

export const UserDirectory: React.FC<UserDirectoryProps> = ({ onStartChat }) => {
  const { user: currentUser, isAdmin } = useAuth();
  const { isUserOnline } = usePresence();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);

  const cleanQuery = searchQuery.trim().toLowerCase().replace(/^@/, '');

  useEffect(() => {
    // Normal users cannot see all users: only fetch when searching a username
    if (!isAdmin && !cleanQuery) {
      setUsers([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        let request = supabase
          .from('profiles')
          .select('*')
          .eq('status', 'active');

        if (!isAdmin) {
          // Normal user can only find users by their username
          request = request.ilike('username', `%${cleanQuery}%`);
        } else if (cleanQuery) {
          // Admin can search by username or display name
          request = request.or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`);
        }

        const { data, error } = await request
          .order('role', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) throw error;
        if (isMounted) {
          setUsers((data as Profile[]) || []);
        }
      } catch (err) {
        console.warn('Error fetching registered users:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cleanQuery, isAdmin]);

  // Filter out self
  const filteredUsers = useMemo(() => {
    return users.filter((u) => u.id !== currentUser?.id);
  }, [users, currentUser?.id]);


  const handleStartConversation = async (targetUser: Profile) => {
    if (!currentUser?.id || startingChatId) return;

    setStartingChatId(targetUser.id);

    try {
      // 1. Try finding an existing conversation between current user and target user
      const { data: existingConvs, error: findError } = await supabase
        .from('conversations')
        .select('id, user_id, recipient_id, admin_id')
        .or(
          `and(user_id.eq.${currentUser.id},or(recipient_id.eq.${targetUser.id},admin_id.eq.${targetUser.id})),and(user_id.eq.${targetUser.id},or(recipient_id.eq.${currentUser.id},admin_id.eq.${currentUser.id}))`
        )
        .limit(1);

      if (!findError && existingConvs && existingConvs.length > 0) {
        onStartChat(existingConvs[0].id, targetUser.username);
        return;
      }

      // 2. Try the get_or_create_conversation RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_or_create_conversation',
        { p_other_user_id: targetUser.id }
      );

      if (!rpcError && rpcData?.id) {
        onStartChat(rpcData.id, targetUser.username);
        return;
      }

      // 3. Direct insertion fallback
      const { data: inserted, error: insertError } = await supabase
        .from('conversations')
        .insert({
          user_id: currentUser.id,
          recipient_id: targetUser.id,
          admin_id: targetUser.id,
        })
        .select('id')
        .single();

      if (!insertError && inserted?.id) {
        onStartChat(inserted.id, targetUser.username);
      } else {
        // If unique index hit, query the existing one
        const { data: fallbackConvs } = await supabase
          .from('conversations')
          .select('id')
          .or(
            `and(user_id.eq.${currentUser.id},or(recipient_id.eq.${targetUser.id},admin_id.eq.${targetUser.id})),and(user_id.eq.${targetUser.id},or(recipient_id.eq.${currentUser.id},admin_id.eq.${currentUser.id}))`
          )
          .limit(1);

        if (fallbackConvs && fallbackConvs.length > 0) {
          onStartChat(fallbackConvs[0].id, targetUser.username);
        } else {
          console.error('Could not initiate conversation:', insertError);
        }
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
    } finally {
      setStartingChatId(null);
    }
  };

  return (
    <div className="flex-1 w-full px-3.5 flex flex-col gap-3">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-muted pointer-events-none" />
        <input
          type="text"
          placeholder={isAdmin ? "Search by name or @username..." : "Find user by @username..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 rounded-2xl bg-field text-ink pl-10 pr-4 text-xs font-medium outline-none shadow-neu-inset border border-line/30 focus:border-ink/40 transition-all placeholder:text-muted/60"
        />
      </div>

      {/* User Directory List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-muted gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-ink" />
          <span className="text-xs font-medium">Searching users…</span>
        </div>
      ) : !cleanQuery && !isAdmin ? (
        <div className="text-center py-12 flex flex-col items-center gap-3 text-muted">
          <div className="w-14 h-14 rounded-full bg-field/80 shadow-neu-flat flex items-center justify-center text-ink/70">
            <Search className="w-6 h-6" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-heading font-bold text-ink text-sm">Find someone by username</span>
            <p className="text-xs text-muted max-w-xs leading-relaxed">
              Type an exact or partial @username to find friends and start chatting.
            </p>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 flex flex-col items-center gap-2 text-muted text-xs font-medium">
          <UserPlus className="w-8 h-8 stroke-[1.5] text-muted/50 mb-1" />
          <span>{searchQuery ? `No users found matching "${searchQuery}".` : 'No users found.'}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 pb-6">
          {filteredUsers.map((u) => {
            const isOnline = isUserOnline(u.id);
            const displayName = getDisplayName(u);
            const isCreator = u.role === 'admin' || u.username === 'ankit' || u.username === 'being_frzi';
            const isStarting = startingChatId === u.id;

            return (
              <motion.div
                key={u.id}
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartConversation(u)}
                className="flex items-center gap-3 p-3 rounded-2xl bg-field/60 shadow-neu-flat hover:shadow-neu-raised cursor-pointer transition-all border border-line/30 select-none"
              >
                {/* Avatar with status */}
                <UserAvatar
                  profile={u}
                  size="md"
                  isOnline={isOnline}
                  showOnlineStatus
                />

                {/* Profile Information */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-heading font-bold text-[14px] text-ink truncate leading-tight">
                      {displayName}
                    </span>

                    {isCreator && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[9.5px] font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Owner</span>
                      </span>
                    )}

                    {isOnline && (
                      <span className="text-[10px] text-emerald-500 font-semibold">online</span>
                    )}
                  </div>

                  <span className="text-[11px] text-muted font-mono leading-tight">
                    @{u.username}
                  </span>

                  {u.bio && (
                    <p className="text-[11.5px] text-muted/80 truncate mt-1 leading-tight">
                      {u.bio}
                    </p>
                  )}
                </div>

                {/* Message Action Button */}
                <button
                  type="button"
                  disabled={isStarting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartConversation(u);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-btn text-btn-ink text-[12px] font-display font-semibold flex items-center gap-1.5 shadow-neu-float hover:opacity-90 transition-all flex-shrink-0 cursor-pointer disabled:opacity-50"
                  aria-label={`Message ${displayName}`}
                >
                  {isStarting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="w-3 h-3" />
                      <span>Chat</span>
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
