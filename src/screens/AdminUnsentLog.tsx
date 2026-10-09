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
    <div className="w-full flex-1 flex flex-col overflow-y-auto px-4 py-3 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Unsent Audit Log</h2>
          <p className="text-xs text-muted">Retained for 30 days</p>
        </div>
        <button
          type="button"
          onClick={fetchAuditLogs}
          className="text-xs px-3.5 py-1.5 rounded-full bg-field shadow-neu-pill text-ink font-semibold hover:opacity-80 transition-all"
        >
          Refresh
        </button>
      </div>

      {/* Info notice */}
      <div className="p-3.5 rounded-2xl bg-field/60 border border-line/30 text-xs text-ink/85 flex items-start gap-2.5 mb-3.5 shadow-neu-inset">
        <Shield className="w-4 h-4 flex-shrink-0 text-ink mt-0.5" />
        <span className="leading-relaxed">
          When any user hits <strong>Unsend</strong>, the message is hard-deleted from live chat
          and preserved here for admin review.
        </span>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl mb-3 bg-field border border-bad/40 text-bad text-xs flex items-center gap-2 shadow-neu-inset">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted">
          <Loader2 className="w-6 h-6 animate-spin text-ink mb-2" />
          <span className="text-xs font-medium">Loading audit entries…</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted text-xs font-medium">No unsent messages logged.</div>
      ) : (
        <div className="flex flex-col gap-2.5 pb-24">
          {logs.map((item) => {
            const senderName = item.sender?.username ?? 'Unknown';
            const deletedByName = item.deleted_by_user?.username ?? 'Unknown';

            return (
              <div
                key={item.id}
                className="bg-field/50 rounded-2xl p-4 border border-line/30 shadow-neu-flat flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-btn text-btn-ink font-display text-xs flex items-center justify-center shadow-neu-raised">
                      {getInitials(senderName)}
                    </div>
                    <div>
                      <span className="font-heading font-bold text-ink">{senderName}</span>
                      <span className="text-muted ml-1.5 text-[11px] font-medium">
                        sent at {formatMessageTime(item.original_created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-muted font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      by <strong>{deletedByName}</strong>
                    </span>
                  </div>
                </div>

                {/* Original content */}
                <div className="p-3.5 rounded-xl bg-surface/70 shadow-neu-inset border border-line/20 text-xs">
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
                        className="max-h-40 max-w-xs object-cover rounded-xl cursor-zoom-in hover:opacity-90 transition-opacity border border-line/40 shadow-sm"
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
