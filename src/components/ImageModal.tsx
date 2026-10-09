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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label="Close image preview"
            className="absolute top-5 right-5 p-2.5 rounded-full bg-surface/30 hover:bg-surface/50 text-white transition-all z-10 shadow-neu-pill"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </motion.button>

          <motion.img
            initial={{ scale: 0.88, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            src={imageUrl}
            alt="Enlarged attachment"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[92vw] object-contain rounded-3xl shadow-neu-float border border-white/10"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
