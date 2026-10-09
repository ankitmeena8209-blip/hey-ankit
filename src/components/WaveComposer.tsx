import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2 } from 'lucide-react';
import { compressImage } from '../lib/utils';

interface WaveComposerProps {
  onSendMessage: (text: string, imageFile?: { blob: Blob; ext: string; isOneTime?: boolean }) => Promise<void>;
  onTyping: () => void;
  disabled?: boolean;
}

export const WaveComposer: React.FC<WaveComposerProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stagedImage, setStagedImage] = useState<{ blob: Blob; previewUrl: string; ext: string } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isOneTime, setIsOneTime] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isFlying, setIsFlying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 88);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setImageError(null);

    if (!typingTimerRef.current) {
      onTyping();
      typingTimerRef.current = setTimeout(() => {
        typingTimerRef.current = null;
      }, 3000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setImageError('Only JPG, PNG, and WebP images are supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsCompressing(true);
      const { blob, ext } = await compressImage(file);
      const previewUrl = URL.createObjectURL(blob);
      setStagedImage({ blob, previewUrl, ext });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process image.';
      setImageError(msg);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const cancelImage = () => {
    if (stagedImage) {
      URL.revokeObjectURL(stagedImage.previewUrl);
    }
    setStagedImage(null);
    setIsOneTime(false);
    setImageError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = text.trim();
    if ((!cleanText && !stagedImage) || isSubmitting || disabled) return;

    try {
      setIsSubmitting(true);
      setIsFlying(true);
      setTimeout(() => setIsFlying(false), 550);

      const imagePayload = stagedImage
        ? { blob: stagedImage.blob, ext: stagedImage.ext, isOneTime }
        : undefined;
      const currentText = cleanText;

      setText('');
      if (stagedImage) {
        URL.revokeObjectURL(stagedImage.previewUrl);
        setStagedImage(null);
        setIsOneTime(false);
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      await onSendMessage(currentText, imagePayload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message.';
      setImageError(msg);
    } finally {
      setIsSubmitting(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = (text.trim().length > 0 || stagedImage !== null) && !isSubmitting && !isCompressing;

  return (
    <div className="absolute left-0 right-0 bottom-0 z-30 pt-3 px-3 pb-3 sm:px-4 sm:pb-3.5 safe-pb bg-gradient-to-t from-surface via-surface/95 to-transparent pointer-events-auto select-none">
      <div className="max-w-md mx-auto flex flex-col gap-1.5">
        {/* Staged image preview */}
        <AnimatePresence>
          {stagedImage && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="relative inline-flex items-center gap-2.5 p-1.5 bg-field rounded-xl shadow-neu-raised self-start border border-line/40"
            >
              <img
                src={stagedImage.previewUrl}
                alt="Upload preview"
                className="w-11 h-11 object-cover rounded-lg shadow-sm"
              />
              <div className="flex flex-col text-[11px] pr-4">
                <span className="font-semibold text-ink">Photo selected</span>
                <span className="text-muted">{(stagedImage.blob.size / 1024).toFixed(0)} KB</span>
              </div>

              {/* View once toggle */}
              <button
                type="button"
                onClick={() => setIsOneTime((prev) => !prev)}
                title="Toggle View Once (1 Time Seen)"
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] transition-all cursor-pointer ${
                  isOneTime
                    ? 'bg-ink text-surface shadow-neu-flat ring-2 ring-emerald-500'
                    : 'bg-field text-muted shadow-neu-pill hover:text-ink'
                }`}
              >
                1
              </button>

              <button
                type="button"
                onClick={cancelImage}
                className="p-1 rounded-full bg-field/80 text-ink hover:opacity-80 transition-opacity cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error notice */}
        {imageError && (
          <div className="text-xs text-bad bg-field/90 px-3 py-1.5 rounded-xl border border-bad/30 font-medium">
            {imageError}
          </div>
        )}

        {/* Control row */}
        <div className="flex items-center gap-2">
          {/* Camera Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isCompressing}
            aria-label="Attach photo"
            className="w-10 h-10 rounded-full bg-field shadow-neu-pill flex items-center justify-center text-ink hover:opacity-90 transition-all flex-shrink-0 disabled:opacity-40 cursor-pointer"
          >
            {isCompressing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-[18px] h-[18px] stroke-[1.9]" />
            )}
          </motion.button>

          {/* View-once indicator toggle if photo staged */}
          {stagedImage && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOneTime((prev) => !prev)}
              title={isOneTime ? 'View Once: ON' : 'View Once: OFF'}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all flex-shrink-0 cursor-pointer ${
                isOneTime
                  ? 'bg-btn text-btn-ink ring-2 ring-emerald-500 shadow-neu-flat'
                  : 'bg-field text-muted shadow-neu-pill'
              }`}
            >
              1
            </motion.button>
          )}

          {/* Neumorphic Inset Input */}
          <div className="flex-1 min-w-0 bg-field shadow-neu-inset rounded-2xl px-3.5 py-1.5 border border-line/30 focus-within:border-ink/40 transition-all flex items-center">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Type your message…"
              disabled={disabled}
              className="w-full resize-none bg-transparent outline-none text-[14px] leading-relaxed text-ink placeholder:text-muted/60 max-h-[88px] overflow-y-auto"
            />
          </div>

          {/* Circular Send Button */}
          <motion.button
            type="button"
            whileHover={canSend ? { scale: 1.06, y: -1 } : {}}
            whileTap={canSend ? { scale: 0.92 } : {}}
            onClick={() => handleSubmit()}
            disabled={!canSend}
            aria-label="Send message"
            className="w-[42px] h-[42px] rounded-full bg-btn text-btn-ink flex items-center justify-center flex-shrink-0 disabled:opacity-30 disabled:shadow-none transition-all shadow-neu-float cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-btn-ink" />
            ) : (
              <motion.svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={
                  isFlying
                    ? {
                        y: [-14, 14, 0],
                        opacity: [0, 0, 1],
                      }
                    : { y: 0, opacity: 1 }
                }
                transition={{ duration: 0.5, ease: [0.2, 1.35, 0.4, 1] }}
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </motion.svg>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
