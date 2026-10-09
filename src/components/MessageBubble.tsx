import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, Edit3, Trash2, X, Check as CheckIcon } from 'lucide-react';
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

  // Calculate live seconds remaining for 20s edit window
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

  // Load image signed URL if image message
  useEffect(() => {
    if (message.type === 'image' && message.image_path) {
      if (message.signed_url) {
        setImageUrl(message.signed_url);
        return;
      }
      setImageLoading(true);
      getSignedImageUrl(message.image_path)
        .then((url) => {
          if (url) setImageUrl(url);
        })
        .finally(() => setImageLoading(false));
    }
  }, [message.type, message.image_path, message.signed_url]);

  // Close popup menu on click outside
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
        y: 8,
        scale: 0.96,
      }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 420,
        damping: 26,
      }}
      className={`relative flex flex-col my-1 max-w-[82%] sm:max-w-[70%] select-text ${
        isSent ? 'self-end items-end origin-bottom-right' : 'self-start items-start origin-bottom-left'
      }`}
    >
      {/* Bubble container */}
      <div
        onClick={() => {
          if (isSent && !isEditing) {
            setMenuOpen((prev) => !prev);
          }
        }}
        className={`relative px-3.5 py-2.5 shadow-sm transition-all ${
          isSent
            ? 'bubble-sent cursor-pointer active:brightness-95'
            : 'bubble-received'
        }`}
      >
        {/* If in edit mode */}
        {isEditing ? (
          <div className="flex flex-col gap-2 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full text-[15px] p-2 rounded-lg bg-black/20 text-white placeholder-white/60 outline-none resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex items-center justify-between text-xs text-white/80">
              <span className="font-mono">{secondsRemaining}s left</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-white flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={secondsRemaining <= 0}
                  className="px-2.5 py-1 rounded bg-white text-g1 font-semibold hover:bg-white/90 flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Image content */}
            {message.type === 'image' && (
              <div className="mb-1.5 overflow-hidden rounded-xl max-w-[280px] bg-black/10">
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
                  <div className="w-56 h-40 flex items-center justify-center bg-black/10 text-xs">
                    Loading image...
                  </div>
                ) : (
                  <div className="w-56 h-28 flex items-center justify-center bg-black/10 text-xs opacity-75">
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
                isSent ? 'text-white/80 justify-end' : 'text-ink/60 justify-end'
              }`}
            >
              {message.edited_at && (
                <span className="italic opacity-85 text-[10.5px]">edited ·</span>
              )}
              <span>{formatMessageTime(message.created_at)}</span>

              {/* Read receipt for sent messages: ✓ or ✓✓ */}
              {isSent && (
                <span className="ml-0.5 inline-flex items-center" title={message.read_at ? "Read" : "Sent"}>
                  {message.read_at ? (
                    <CheckCheck className="w-3.5 h-3.5 stroke-[2.5] text-cyan-200" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[2.2] text-white/80" />
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
            initial={{ opacity: 0, scale: 0.85, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute -top-12 right-0 z-30 bg-surface text-ink rounded-xl shadow-xl border border-line py-1 px-1.5 flex items-center gap-1 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Edit button */}
            {message.type === 'text' && (
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => {
                  setIsEditing(true);
                  setMenuOpen(false);
                }}
                className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-teal-950 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                <Edit3 className="w-3.5 h-3.5 text-g1" />
                <span>
                  Edit {canEdit ? `· ${secondsRemaining}s left` : ''}
                </span>
              </button>
            )}

            {/* Unsend button */}
            <button
              type="button"
              onClick={() => setShowUnsendConfirm(true)}
              className="px-2 py-1 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-1.5 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Unsend</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unsend confirmation modal */}
      <AnimatePresence>
        {showUnsendConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
              className="bg-surface text-ink p-5 rounded-2xl shadow-2xl max-w-xs w-full border border-line"
            >
              <h3 className="font-bold text-base mb-1.5 text-ink">Unsend message?</h3>
              <p className="text-xs text-muted leading-relaxed mb-4">
                This message will be removed from the chat for everyone. An audit log entry is preserved for admin review.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnsendConfirm(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-teal-950 text-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUnsend}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
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
