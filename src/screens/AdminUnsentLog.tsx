import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { MessageAudit } from '../types/database';
import { Shield, Clock, Loader2, AlertCircle } from 'lucide-react';
import { getInitials, getSignedImageUrl, formatMessageTime } from '../lib/utils';
import { ImageModal } from '../components/ImageModal';

export const AdminUnsentLog: React.FC = () => {
  const [logs, setLogs] = useState<MessageAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('message_audit')
        .select(`
          *,
          sender:profiles!message_audit_sender_id_fkey(username),
          deleted_by_user:profiles!message_audit_deleted_by_fkey(username)
        `)
        .order('deleted_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      // Resolve signed images for audit records
      const auditRecords = (data as MessageAudit[]) || [];
      const withImages = await Promise.all(
        auditRecords.map(async (record) => {
          if (record.image_path) {
            const url = await getSignedImageUrl(record.image_path);
            return { ...record, signed_url: url ?? undefined };
          }
          return record;
        })
      );

      setLogs(withImages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch audit log';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <div className="w-full flex-1 flex flex-col overflow-y-auto px-4 sm:px-6 py-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Unsent Audit Log</h2>
          <p className="text-xs text-muted">
            Permanent records of messages unsent by users. Retained for 30 days.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAuditLogs}
          className="text-xs px-3 py-1.5 rounded-lg bg-surface border border-line hover:bg-black/5 text-ink font-semibold"
        >
          Refresh
        </button>
      </div>

      {/* Info notice */}
      <div className="p-3.5 rounded-2xl bg-g1/10 border border-g1/20 text-xs text-ink/90 flex items-start gap-2.5 mb-4">
        <Shield className="w-4 h-4 flex-shrink-0 text-g1 mt-0.5" />
        <span className="leading-relaxed">
          When any user hits <strong>Unsend</strong>, the message is hard-deleted from live chat
          and immediately logged here. Only admin has access to this log.
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl mb-4 bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted">
          <Loader2 className="w-6 h-6 animate-spin text-g1 mb-2" />
          <span className="text-xs">Loading audit entries...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted text-xs">No unsent messages logged.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((item) => {
            const senderName = item.sender?.username ?? 'Unknown';
            const deletedByName = item.deleted_by_user?.username ?? 'Unknown';

            return (
              <div
                key={item.id}
                className="bg-surface rounded-2xl p-4 border border-line shadow-sm flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-g2/20 flex items-center justify-center text-g1 font-bold text-xs">
                      {getInitials(senderName)}
                    </div>
                    <div>
                      <span className="font-bold text-ink">{senderName}</span>
                      <span className="text-muted ml-1.5 text-[11px]">
                        sent at {formatMessageTime(item.original_created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-muted">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Unsent on {new Date(item.deleted_at).toLocaleDateString()} by{' '}
                      <strong>{deletedByName}</strong>
                    </span>
                  </div>
                </div>

                {/* Original content */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-teal-950/40 border border-line/60 text-xs">
                  {item.body && (
                    <p className="font-sans text-ink leading-relaxed break-words whitespace-pre-wrap">
                      {item.body}
                    </p>
                  )}

                  {item.signed_url && (
                    <div className="mt-2">
                      <img
                        src={item.signed_url}
                        alt="Unsent attachment"
                        onClick={() => setPreviewImage(item.signed_url ?? null)}
                        className="max-h-48 max-w-xs object-cover rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity border border-line"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enlarged image preview */}
      <ImageModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
};
