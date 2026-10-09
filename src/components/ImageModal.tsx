import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  return (
    <AnimatePresence>
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all z-10"
          >
            <X className="w-6 h-6 stroke-[2]" />
          </button>

          <motion.img
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            src={imageUrl}
            alt="Enlarged attachment"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
