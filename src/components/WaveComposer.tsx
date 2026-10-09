import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Send, X, Loader2 } from 'lucide-react';
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setImageError(null);

    // Throttle typing notification (~every 3s)
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

    // Check MIME type: strictly jpeg, png, webp (no GIF)
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
      const imagePayload = stagedImage ? { blob: stagedImage.blob, ext: stagedImage.ext } : undefined;
      const currentText = cleanText;

      // Clear input state
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
    <div className="relative w-full z-20 flex-shrink-0 select-none">
      {/* Top wavy SVG edge */}
      <div className="w-full overflow-hidden leading-none pointer-events-none -mb-[1px]">
        <svg
          viewBox="0 0 1200 40"
          preserveAspectRatio="none"
          className="relative block w-full h-3 sm:h-4 text-g1 fill-current"
        >
          <path d="M0,40 C200,8 450,42 700,12 C950,-12 1100,32 1200,20 L1200,40 L0,40 Z" />
        </svg>
      </div>

      {/* Composer background strip with teal gradient */}
      <div className="bg-gradient-to-r from-g1 via-g2 to-g1 px-3 sm:px-5 pb-3 pt-2 text-white safe-pb shadow-lg">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Staged image preview */}
          <AnimatePresence>
            {stagedImage && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="relative inline-flex items-center gap-3 p-2 bg-black/25 rounded-xl backdrop-blur-sm self-start border border-white/20"
              >
                <img
                  src={stagedImage.previewUrl}
                  alt="Upload preview"
                  className="w-14 h-14 object-cover rounded-lg shadow-sm"
                />
                <div className="flex flex-col text-xs pr-6">
                  <span className="font-semibold text-white/90">Image ready</span>
                  <span className="text-white/60">{(stagedImage.blob.size / 1024).toFixed(0)} KB</span>
                </div>
                <button
                  type="button"
                  onClick={cancelImage}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white/90"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error alert */}
          {imageError && (
            <div className="text-xs text-rose-200 bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-500/30">
              {imageError}
            </div>
          )}

          {/* Input control row */}
          <div className="flex items-end gap-2">
            {/* Camera / gallery button */}
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
              className="touch-target p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all border border-white/20 shadow-sm flex-shrink-0 disabled:opacity-50"
            >
              {isCompressing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5 stroke-[2]" />
              )}
            </motion.button>

            {/* Auto-growing Text Input */}
            <div className="flex-1 min-w-0 bg-white/95 text-ink rounded-2xl px-3.5 py-2 shadow-inner focus-within:ring-2 focus-within:ring-white transition-all flex items-center">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Type a message..."
                disabled={disabled}
                className="w-full resize-none bg-transparent outline-none text-[15px] leading-relaxed text-ink placeholder:text-muted/60 max-h-[120px] overflow-y-auto"
              />
            </div>

            {/* Send Button with Flight Motion */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => handleSubmit()}
              disabled={!canSend}
              aria-label="Send message"
              className="touch-target p-2.5 rounded-full bg-white text-g1 hover:bg-white/90 active:bg-white/80 flex items-center justify-center transition-all shadow-md flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <AnimatePresence mode="wait">
                {isSubmitting ? (
                  <motion.div
                    key="sending"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-g1" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ x: -2, y: 2 }}
                    whileHover={{ x: 2, y: -2 }}
                    className="flex items-center justify-center"
                  >
                    <Send className="w-5 h-5 stroke-[2.5]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
