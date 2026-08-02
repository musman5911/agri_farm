import React, { useEffect, useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

// Global stack counter so child modals (opened on top of parents) get a higher z-index
// and their backdrop only covers the parent, not letting clicks bleed through to the
// dashboard.
let modalStack = 0;

export default function DetailModal({
  open, 
  onClose, 
  title, 
  subtitle, 
  icon, 
  iconBg = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  children, 
  size = 'md', 
  onBack, 
  backLabel, 
  zIndex,
}) {
  const [myLevel] = useState(() => { modalStack += 1; return modalStack; });
  useEffect(() => () => { modalStack = Math.max(0, modalStack - 1); }, []);

  useEffect(() => {
    if (!open) return;
    
    // When multiple modals are open, ESC closes the top-most one only.
    // We handle this via the stack level: this listener only fires if this is the top.
    const handler = (e) => {
      if (e.key === 'Escape') {
        const top = Number(document.body.dataset.topModal || '0');
        if (top === myLevel) onClose();
      }
    };
    
    window.addEventListener('keydown', handler);
    if (myLevel > Number(document.body.dataset.topModal || '0')) {
      document.body.dataset.topModal = String(myLevel);
    }
    
    // Lock body scroll but remember the current scroll position so the page
    // doesn't jump to the top on mobile when overflow:hidden kicks in.
    if (myLevel === 1) {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body._ffScrollY = scrollY;
    }
    
    return () => {
      window.removeEventListener('keydown', handler);
      const cur = Number(document.body.dataset.topModal || '0');
      if (cur === myLevel) {
        delete document.body.dataset.topModal;
      }
      if (myLevel === 1) {
        const scrollY = document.body._ffScrollY || 0;
        document.documentElement.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      }
    };
  }, [open, onClose, myLevel]);

  if (!open) return null;

  const widthCls = size === 'sm' ? 'max-w-md'
    : size === 'lg' ? 'max-w-3xl'
    : size === 'xl' ? 'max-w-5xl'
    : 'max-w-2xl';
  const computedZ = zIndex ?? (55 + myLevel * 5);
  const isChild = !!onBack;

  return (
    <AnimatePresence>
      {open && (
        <div 
          style={{ zIndex: computedZ }} 
          className="fixed inset-0 flex items-center justify-center p-4 md:p-6"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`fixed inset-0 cursor-pointer ${
              isChild 
                ? 'bg-black/75 backdrop-blur-[2px]' 
                : 'bg-black/60 backdrop-blur-xs'
            }`}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`relative w-full ${widthCls} bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                {onBack && (
                  <button 
                    onClick={onBack} 
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1 cursor-pointer"
                    title={backLabel || "Back"}
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                {icon && (
                  <div className={`p-2 rounded-xl shrink-0 ${iconBg}`}>
                    {icon}
                  </div>
                )}
                <div>
                  <h3 className="text-sm md:text-base font-black text-slate-800 dark:text-white">{title}</h3>
                  {subtitle && (
                    <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>
              
              <button 
                onClick={onClose} 
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 text-slate-700 dark:text-slate-300">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
