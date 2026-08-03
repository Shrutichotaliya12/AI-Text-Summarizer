import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Content Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-surface rounded-lg max-w-lg w-full p-6 shadow-premium border border-borderToken z-10"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              {title && (
                <h3 className="text-base font-bold text-main font-display">
                  {title}
                </h3>
              )}
              <button
                onClick={onClose}
                className="text-muted hover:text-main p-1 transition-all rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="text-muted dark:text-slate-300 text-sm">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default Modal;
