import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2 } from 'lucide-react';
import { compressImage } from '../lib/utils';

interface WaveComposerProps {
  onSendMessage: (text: string, imageFile?: { blob: Blob; ext: string }) => Promise<void>;
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
  const [imageError, setImageError] = useState<string | null>(null);
  const [isFlying, setIsFlying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 100);
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
    setImageError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = text.trim();
    if ((!cleanText && !stagedImage) || isSubmitting || disabled) return;

    try {
      setIsSubmitting(true);
      setIsFlying(true);
      setTimeout(() => setIsFlying(false), 600);

      const imagePayload = stagedImage ? { blob: stagedImage.blob, ext: stagedImage.ext } : undefined;
      const currentText = cleanText;

      setText('');
      if (stagedImage) {
        URL.revokeObjectURL(stagedImage.previewUrl);
        setStagedImage(null);
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
    <div className="absolute left-0 right-0 bottom-0 z-30 pt-6 px-3 pb-3 sm:px-4 sm:pb-4 safe-pb bg-gradient-to-t from-surface via-surface/90 to-transparent pointer-events-auto select-none">
      <div className="max-w-4xl mx-auto flex flex-col gap-2">
        {/* Staged image preview */}
        <AnimatePresence>
          {stagedImage && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="relative inline-flex items-center gap-3 p-2 bg-field rounded-2xl shadow-neu self-start border border-line"
            >
              <img
                src={stagedImage.previewUrl}
                alt="Upload preview"
                className="w-14 h-14 object-cover rounded-xl shadow-sm"
              />
              <div className="flex flex-col text-xs pr-6">
                <span className="font-semibold text-ink">Image ready</span>
                <span className="text-muted">{(stagedImage.blob.size / 1024).toFixed(0)} KB</span>
              </div>
              <button
                type="button"
                onClick={cancelImage}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-btn text-btn-ink hover:opacity-80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error notice */}
        {imageError && (
          <div className="text-xs text-bad bg-field px-3 py-1.5 rounded-xl border border-bad/30 font-medium">
            {imageError}
          </div>
        )}

        {/* Input control row */}
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
            whileTap={{ scale: 0.92 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isCompressing}
            aria-label="Attach photo"
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-field/70 transition-colors flex-shrink-0 disabled:opacity-40"
          >
            {isCompressing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-[22px] h-[22px] stroke-[1.8]" />
            )}
          </motion.button>

          {/* Neumorphic Pill Input */}
          <div className="flex-1 min-w-0 bg-field shadow-neu rounded-[22px] px-4 py-2 border-2 border-transparent focus-within:border-ink transition-all flex items-center">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Type your message…"
              disabled={disabled}
              className="w-full resize-none bg-transparent outline-none text-[15px] leading-relaxed text-ink placeholder:text-muted max-h-[100px] overflow-y-auto"
            />
          </div>

          {/* Black Circular Send Button with Up-Arrow Fly Motion */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => handleSubmit()}
            disabled={!canSend}
            aria-label="Send message"
            className="w-[46px] h-[46px] rounded-full bg-btn text-btn-ink flex items-center justify-center flex-shrink-0 disabled:opacity-35 transition-opacity shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <motion.svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={
                  isFlying
                    ? {
                        y: [-16, 16, 0],
                        opacity: [0, 0, 1],
                      }
                    : { y: 0, opacity: 1 }
                }
                transition={{ duration: 0.55, ease: [0.2, 1.35, 0.4, 1] }}
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
