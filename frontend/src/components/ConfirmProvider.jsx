import React, { createContext, useContext, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, CheckCircle, HelpCircle, X, ShieldCheck } from 'lucide-react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import ModalPortal from './ModalPortal';

const ConfirmContext = createContext(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used inside a ConfirmProvider');
  }
  return context;
}

export default function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { title, message, tone, confirmLabel, cancelLabel, resolve }
  const resolverRef = useRef(null);

  useBodyScrollLock(!!dialog);

  const confirm = (options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: options.title || 'Are you sure?',
        message: options.message || '',
        tone: options.tone || 'default', // 'default' | 'warning' | 'danger'
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
      });
    });
  };

  const handleCancel = () => {
    if (resolverRef.current) {
      resolverRef.current(false);
    }
    setDialog(null);
  };

  const handleConfirm = () => {
    if (resolverRef.current) {
      resolverRef.current(true);
    }
    setDialog(null);
  };

  // Get matching icon and classes based on tone
  const getToneSettings = (tone) => {
    switch (tone) {
      case 'danger':
        return {
          icon: <ShieldAlert size={24} className="text-red-600 dark:text-red-400" />,
          iconBg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30',
          btnClass: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400" />,
          iconBg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white'
        };
      case 'default':
      default:
        return {
          icon: <HelpCircle size={24} className="text-farm-600 dark:text-farm-400" />,
          iconBg: 'bg-farm-50 dark:bg-farm-950/20 border-farm-200 dark:border-farm-900/30',
          btnClass: 'bg-farm-600 hover:bg-farm-700 text-white'
        };
    }
  };

  const toneSettings = dialog ? getToneSettings(dialog.tone) : null;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ModalPortal>
        <AnimatePresence>
          {dialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop with fade animation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCancel}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
              />

              {/* Dialog Card with spring slide entrance */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="relative w-full max-w-sm bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 flex flex-col space-y-4 text-slate-800 dark:text-slate-100"
              >
                <div className="flex gap-4 items-start">
                  <div className={`p-3 rounded-2xl border ${toneSettings.iconBg} shrink-0`}>
                    {toneSettings.icon}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-800 dark:text-white">{dialog.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{dialog.message}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {dialog.cancelLabel}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${toneSettings.btnClass}`}
                  >
                    {dialog.confirmLabel}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </ConfirmContext.Provider>
  );
}
