import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { UserCheck, UserX, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { getInitials } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const AdminUsers: React.FC = () => {
  const { session, user: currentUser } = useAuth();
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
    if (!session?.access_token) return;

    setActionLoading(targetUserId);
    setFeedback(null);

    try {
      // Call Supabase Edge Function: admin-manage-user
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action, targetUserId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Action failed on server.');
      }

      setFeedback({ type: 'success', message: result.message || `User ${action}d successfully.` });
      await fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing admin action';
      setFeedback({ type: 'error', message: `${msg} (Ensure Edge Function is deployed)` });
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col overflow-y-auto px-4 sm:px-6 py-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-ink">User Directory</h2>
          <p className="text-xs text-muted">Manage accounts, status and permissions</p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          className="text-xs px-3 py-1.5 rounded-lg bg-surface border border-line hover:bg-black/5 text-ink font-semibold"
        >
          Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted">
          <Loader2 className="w-6 h-6 animate-spin text-g1 mb-2" />
          <span className="text-xs">Loading user accounts...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted text-xs">No registered users found.</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {users.map((u) => {
            const isSelf = u.id === currentUser?.id;
            const isProcessing = actionLoading === u.id;

            return (
              <div
                key={u.id}
                className="bg-surface rounded-2xl p-3.5 sm:p-4 border border-line shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-g2/20 border border-g2/30 flex items-center justify-center text-g1 font-bold text-sm flex-shrink-0">
                    {getInitials(u.username)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">{u.username}</span>
                      {u.role === 'admin' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-g1/15 text-g1">
                          Admin
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          u.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted block mt-0.5">
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {!isSelf && (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {u.status === 'active' ? (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setConfirmDialog({ action: 'disable', targetUser: u })}
                        className="touch-target px-3 py-1.5 rounded-xl border border-line hover:bg-amber-50 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Disable</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setConfirmDialog({ action: 'restore', targetUser: u })}
                        className="touch-target px-3 py-1.5 rounded-xl border border-line hover:bg-emerald-50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setConfirmDialog({ action: 'delete', targetUser: u })}
                      className="touch-target px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface text-ink p-5 rounded-2xl shadow-2xl max-w-sm w-full border border-line">
            <h3 className="font-bold text-base mb-1.5 text-ink capitalize">
              {confirmDialog.action} User: {confirmDialog.targetUser.username}
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              {confirmDialog.action === 'delete'
                ? 'Are you sure you want to permanently delete this user? Their profile, conversation, and files will be removed. Unsent audit records are retained.'
                : `Are you sure you want to ${confirmDialog.action} this user?`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-slate-100 text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeAction(confirmDialog.action, confirmDialog.targetUser.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white shadow-sm ${
                  confirmDialog.action === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-g1 hover:bg-g2'
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
