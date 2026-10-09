import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Lock, Check as CheckIcon, X } from 'lucide-react';
import type { Message } from '../types/database';
import { isMediaExpired } from '../types/database';
import { formatMessageTime, getSignedImageUrl } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  onEdit: (messageId: string, newBody: string) => Promise<void>;
  onUnsend: (messageId: string) => Promise<void>;
  onImageClick?: (url: string) => void;
  onMarkOneTimeViewed?: (messageId: string) => Promise<void>;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSent,
  onEdit,
  onUnsend,
  onImageClick,
  onMarkOneTimeViewed,
}) => {
  const { user, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.body ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(message.signed_url ?? null);
  const [imageLoading, setImageLoading] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [showUnsendConfirm, setShowUnsendConfirm] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const mediaExpired = message.type === 'image' && isMediaExpired(message.created_at);

  const isOneTime = Boolean(message.is_one_time);
  const userHasViewed = Boolean(
    user?.id && message.viewed_by && message.viewed_by.includes(user.id)
  );
  // Normal user cannot view again once viewed; admin can always view
  const isOneTimeLocked = isOneTime && userHasViewed && !isAdmin;

  // Live 20s countdown for edit window
  useEffect(() => {
    if (!isSent || message.type !== 'text') return;

    const calculateRemaining = () => {
      const createdTime = new Date(message.created_at).getTime();
      const now = Date.now();
      const elapsedSeconds = (now - createdTime) / 1000;
      const remaining = Math.max(0, Math.ceil(20 - elapsedSeconds));
      setSecondsRemaining(remaining);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 500);
    return () => clearInterval(interval);
  }, [message.created_at, isSent, message.type]);

  // Load signed image URL if needed and not expired
  useEffect(() => {
    let isMounted = true;
    if (message.type === 'image' && message.image_path && !mediaExpired && !isOneTimeLocked) {
      if (message.signed_url) {
        setImageUrl(message.signed_url);
        return;
      }
      setImageLoading(true);
      getSignedImageUrl(message.image_path)
        .then((url) => {
          if (url && isMounted) setImageUrl(url);
        })
        .finally(() => {
          if (isMounted) setImageLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [message.type, message.image_path, message.signed_url, mediaExpired, isOneTimeLocked]);

  // Close popup menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText.trim() === message.body) {
      setIsEditing(false);
      return;
    }
    try {
      await onEdit(message.id, editText.trim());
      setIsEditing(false);
      setMenuOpen(false);
    } catch (err) {
      console.error('Edit error:', err);
    }
  };

  const handleConfirmUnsend = async () => {
    setShowUnsendConfirm(false);
    setMenuOpen(false);
    try {
      await onUnsend(message.id);
    } catch (err) {
      console.error('Unsend error:', err);
    }
  };

  const handleOneTimePhotoClick = async () => {
    if (isOneTimeLocked || mediaExpired) return;
    if (imageUrl) {
      onImageClick?.(imageUrl);
      if (!isAdmin && onMarkOneTimeViewed) {
        await onMarkOneTimeViewed(message.id);
      }
    }
  };

  const canEdit = isSent && message.type === 'text' && secondsRemaining > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className={`relative flex flex-col my-0.5 max-w-[82%] select-text ${
        isSent ? 'self-end items-end origin-bottom-right' : 'self-start items-start origin-bottom-left'
      }`}
    >
      {/* Bubble Container */}
      <div
        onClick={() => {
          if (isSent && !isEditing) {
            setMenuOpen((prev) => !prev);
          }
        }}
        className={`relative px-3.5 py-2 transition-all ${
          isSent
            ? 'bubble-sent cursor-pointer active:brightness-95'
            : 'bubble-received'
        }`}
      >
        {isEditing ? (
          <div className="flex flex-col gap-2 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full text-[14px] p-2.5 rounded-xl bg-field shadow-neu-inset text-ink placeholder:text-muted outline-none resize-none border border-line/30"
              rows={2}
              autoFocus
            />
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-mono font-medium">{secondsRemaining}s left</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-field shadow-neu-pill text-ink flex items-center gap-1 font-medium text-xs hover:opacity-80 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={secondsRemaining <= 0}
                  className="px-3 py-1.5 rounded-lg bg-btn text-btn-ink font-semibold flex items-center gap-1 shadow-neu-flat disabled:opacity-50 text-xs cursor-pointer"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Image attachment */}
            {message.type === 'image' && (
              <div className="mb-1">
                {mediaExpired ? (
                  <div className="p-2.5 rounded-xl bg-field/60 border border-line/40 text-xs text-muted flex items-center gap-2">
                    <Clock className="w-4 h-4 text-bad flex-shrink-0" />
                    <span>Photo expired (10 days limit)</span>
                  </div>
                ) : isOneTime ? (
                  isOneTimeLocked ? (
                    <div className="p-2.5 rounded-xl bg-field/40 border border-line/30 text-xs text-muted flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted flex-shrink-0" />
                      <span>Opened · View once photo</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOneTimePhotoClick();
                      }}
                      className="p-2.5 rounded-xl bg-field/70 shadow-neu-pill hover:bg-field transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer select-none"
                    >
                      <div className="w-5 h-5 rounded-full bg-btn text-btn-ink font-bold flex items-center justify-center text-[10px]">
                        1
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-ink">View once photo</span>
                        <span className="text-[10px] text-muted font-normal">
                          {isAdmin ? 'Admin: Unlimited' : 'Tap to view once'}
                        </span>
                      </div>
                    </button>
                  )
                ) : (
                  <div className="overflow-hidden rounded-xl max-w-[240px] bg-field/50 p-1 shadow-neu-inset">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Chat attachment"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageClick?.(imageUrl);
                        }}
                        className="w-full max-h-64 object-cover rounded-lg cursor-zoom-in hover:opacity-95 transition-opacity"
                      />
                    ) : imageLoading ? (
                      <div className="w-48 h-32 flex items-center justify-center bg-field text-xs text-muted">
                        Loading photo…
                      </div>
                    ) : (
                      <div className="w-48 h-24 flex items-center justify-center bg-field text-xs text-muted">
                        Photo unavailable
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Text body */}
            {message.body && (
              <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap font-normal">
                {message.body}
              </p>
            )}

            {/* Meta row: timestamp, edited status, read receipts */}
            <div
              className={`flex items-center gap-1.5 mt-0.5 text-[11px] font-medium select-none ${
                isSent ? 'text-btn-ink/75 justify-end' : 'text-muted justify-end'
              }`}
            >
              {message.edited_at && (
                <span className="italic opacity-80 text-[10px]">edited ·</span>
              )}
              <time>{formatMessageTime(message.created_at)}</time>

              {isSent && (
                <span
                  className={`ml-0.5 font-bold ${
                    message.read_at ? 'text-emerald-400' : 'opacity-80'
                  }`}
                  title={message.read_at ? 'Seen by recipient' : 'Sent'}
                >
                  {message.read_at ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Floating Action Menu for Sent messages */}
      <AnimatePresence>
        {menuOpen && !isEditing && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute -top-11 right-0 z-30 bg-surface text-ink rounded-xl shadow-neu-float border border-line/40 py-1 px-1 flex items-center gap-1 text-xs origin-top-right"
            onClick={(e) => e.stopPropagation()}
          >
            {message.type === 'text' && (
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => {
                  setIsEditing(true);
                  setMenuOpen(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-field shadow-neu-pill hover:opacity-90 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all cursor-pointer"
              >
                <span>{canEdit ? `Edit · ${secondsRemaining}s left` : 'Edit locked'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowUnsendConfirm(true)}
              className="px-2.5 py-1 rounded-lg bg-field shadow-neu-pill hover:opacity-90 text-bad flex items-center gap-1 font-medium transition-all cursor-pointer"
            >
              <span>Unsend</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unsend confirmation modal */}
      <AnimatePresence>
        {showUnsendConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={(e) => {
              e.stopPropagation();
              setShowUnsendConfirm(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface text-ink p-5 rounded-2xl shadow-neu-float max-w-xs w-full border border-line/40"
            >
              <h3 className="font-heading font-bold text-base mb-1 text-ink">Unsend message?</h3>
              <p className="text-xs text-muted leading-relaxed mb-4">
                This message will be removed from the chat for everyone. An audit log entry is preserved for admin review.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnsendConfirm(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-field shadow-neu-pill hover:opacity-80 text-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUnsend}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-btn text-btn-ink shadow-neu-flat hover:opacity-90 cursor-pointer"
                >
                  Unsend
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
