import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { UserCheck, UserX, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { getInitials } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const AdminUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    action: 'disable' | 'restore' | 'delete';
    targetUser: Profile;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as Profile[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load users';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const executeAction = async (action: 'disable' | 'restore' | 'delete', targetUserId: string) => {
    setActionLoading(targetUserId);
    setFeedback(null);

    try {
      if (action === 'delete') {
        const { error } = await supabase.rpc('admin_delete_user', {
          p_target_user_id: targetUserId,
        });
        if (error) throw error;
        setFeedback({ type: 'success', message: 'User deleted permanently.' });
      } else {
        const newStatus = action === 'disable' ? 'disabled' : 'active';
        const { error } = await supabase.rpc('admin_set_user_status', {
          p_target_user_id: targetUserId,
          p_status: newStatus,
        });
        if (error) throw error;
        setFeedback({
          type: 'success',
          message: `User ${action === 'disable' ? 'disabled' : 'restored'} successfully.`,
        });
      }

      await fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing admin action';
      setFeedback({
        type: 'error',
        message: msg.includes('admin_delete_user') || msg.includes('admin_set_user_status')
          ? 'Admin database functions need to be initialized in Supabase SQL editor.'
          : msg,
      });
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col overflow-y-auto px-4 py-3 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-ink">User Directory</h2>
          <p className="text-xs text-muted">Manage accounts and permissions</p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          className="text-xs px-3.5 py-1.5 rounded-full bg-field shadow-neu-pill text-ink font-semibold hover:opacity-80 transition-all"
        >
          Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl mb-3 text-xs flex items-center gap-2 border shadow-neu-inset ${
            feedback.type === 'success'
              ? 'bg-field border-ok/40 text-ok'
              : 'bg-field border-bad/40 text-bad'
          }`}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted">
          <Loader2 className="w-6 h-6 animate-spin text-ink mb-2" />
          <span className="text-xs font-medium">Loading user accounts…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted text-xs font-medium">No registered users found.</div>
      ) : (
        <div className="flex flex-col gap-2.5 pb-24">
          {users.map((u) => {
            const isSelf = u.id === currentUser?.id;
            const isProcessing = actionLoading === u.id;

            return (
              <div
                key={u.id}
                className="bg-field/50 rounded-2xl p-4 border border-line/30 shadow-neu-flat flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-btn text-btn-ink font-display text-[18px] flex items-center justify-center flex-shrink-0 shadow-neu-raised">
                      {getInitials(u.username)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-sm text-ink">{u.username}</span>
                        {u.role === 'admin' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-pill text-white shadow-neu-pill">
                            Admin
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.status === 'active'
                              ? 'bg-field shadow-neu-pill text-ok'
                              : 'bg-field shadow-neu-pill text-bad'
                          }`}
                        >
                          {u.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted block mt-0.5 font-medium">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isSelf && (
                    <div className="flex items-center gap-1.5">
                      {u.status === 'active' ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setConfirmDialog({ action: 'disable', targetUser: u })}
                          className="h-9 px-3 rounded-xl bg-field shadow-neu-pill text-muted hover:text-ink text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                          title="Disable user"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Disable</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setConfirmDialog({ action: 'restore', targetUser: u })}
                          className="h-9 px-3 rounded-xl bg-field shadow-neu-pill text-ok hover:opacity-80 text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                          title="Restore user"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Restore</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setConfirmDialog({ action: 'delete', targetUser: u })}
                        className="h-9 px-3 rounded-xl bg-field shadow-neu-pill text-bad hover:opacity-80 text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-surface text-ink p-6 rounded-3xl shadow-neu-float max-w-xs w-full border border-line/40">
            <h3 className="font-heading font-bold text-base mb-1.5 text-ink capitalize">
              {confirmDialog.action} User: {confirmDialog.targetUser.username}
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-5">
              {confirmDialog.action === 'delete'
                ? 'Are you sure you want to permanently delete this user? Their profile, conversation, and files will be removed. Unsent audit records are retained.'
                : `Are you sure you want to ${confirmDialog.action} this user?`}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-field shadow-neu-pill hover:opacity-80 text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeAction(confirmDialog.action, confirmDialog.targetUser.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl text-btn-ink shadow-neu-flat ${
                  confirmDialog.action === 'delete' ? 'bg-bad text-white' : 'bg-btn text-btn-ink'
                }`}
              >
                Confirm {confirmDialog.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
