import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, X, Check as CheckIcon } from 'lucide-react';
import type { Message } from '../types/database';
import { formatMessageTime, getSignedImageUrl } from '../lib/utils';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  onEdit: (messageId: string, newBody: string) => Promise<void>;
  onUnsend: (messageId: string) => Promise<void>;
  onImageClick?: (url: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSent,
  onEdit,
  onUnsend,
  onImageClick,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.body ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(message.signed_url ?? null);
  const [imageLoading, setImageLoading] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [showUnsendConfirm, setShowUnsendConfirm] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

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

  // Load signed image URL if needed
  useEffect(() => {
    let isMounted = true;
    if (message.type === 'image' && message.image_path) {
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
  }, [message.type, message.image_path, message.signed_url]);

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

  const canEdit = isSent && message.type === 'text' && secondsRemaining > 0;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
        scale: 0.96,
      }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 24,
      }}
      className={`relative flex flex-col my-1 max-w-[80%] select-text ${
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
        className={`relative px-3.5 py-2.5 transition-all ${
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
              className="w-full text-[15px] p-2.5 rounded-xl bg-field shadow-neu-inset text-ink placeholder:text-muted outline-none resize-none border border-line/30"
              rows={2}
              autoFocus
            />
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-mono font-medium">{secondsRemaining}s left</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-field shadow-neu-pill text-ink flex items-center gap-1 font-medium text-xs hover:opacity-80"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={secondsRemaining <= 0}
                  className="px-3 py-1.5 rounded-lg bg-btn text-btn-ink font-semibold flex items-center gap-1 shadow-neu-flat disabled:opacity-50 text-xs"
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
              <div className="mb-1.5 overflow-hidden rounded-2xl max-w-[260px] bg-field shadow-neu-inset p-1">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Chat attachment"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageClick?.(imageUrl);
                    }}
                    className="w-full max-h-72 object-cover rounded-xl cursor-zoom-in hover:opacity-95 transition-opacity"
                  />
                ) : imageLoading ? (
                  <div className="w-56 h-36 flex items-center justify-center bg-field text-xs text-muted">
                    Loading image…
                  </div>
                ) : (
                  <div className="w-56 h-28 flex items-center justify-center bg-field text-xs text-muted">
                    Image unavailable
                  </div>
                )}
              </div>
            )}

            {/* Text body */}
            {message.body && (
              <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-normal">
                {message.body}
              </p>
            )}

            {/* Meta row: timestamp, edited status, read receipts */}
            <div
              className={`flex items-center gap-1.5 mt-1 text-[11px] font-medium select-none ${
                isSent ? 'text-white/70 dark:text-ink/70 justify-end' : 'text-muted justify-end'
              }`}
            >
              {message.edited_at && (
                <span className="italic opacity-85 text-[10.5px]">edited ·</span>
              )}
              <time>{formatMessageTime(message.created_at)}</time>

              {isSent && (
                <span className="ml-0.5 inline-flex items-center" title={message.read_at ? "Read" : "Sent"}>
                  {message.read_at ? (
                    <CheckCheck className="w-3.5 h-3.5 stroke-[2.5] text-ok" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[2.2] opacity-80" />
                  )}
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
            className="absolute -top-12 right-0 z-30 bg-surface text-ink rounded-2xl shadow-neu-float border border-line/40 py-1.5 px-1.5 flex items-center gap-1.5 text-xs origin-top-right"
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
                className="px-3 py-1.5 rounded-xl bg-field/70 shadow-neu-pill hover:bg-field flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all"
              >
                <span>{canEdit ? `Edit · ${secondsRemaining}s left` : 'Edit locked'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowUnsendConfirm(true)}
              className="px-3 py-1.5 rounded-xl bg-field/70 shadow-neu-pill hover:bg-field text-bad flex items-center gap-1.5 font-medium transition-all"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
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
              className="bg-surface text-ink p-6 rounded-3xl shadow-neu-float max-w-xs w-full border border-line/40"
            >
              <h3 className="font-heading font-bold text-base mb-1.5 text-ink">Unsend message?</h3>
              <p className="text-xs text-muted leading-relaxed mb-5">
                This message will be removed from the chat for everyone. An audit log entry is preserved for admin review.
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUnsendConfirm(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-field shadow-neu-pill hover:opacity-80 text-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUnsend}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-btn text-btn-ink shadow-neu-flat hover:opacity-90"
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
