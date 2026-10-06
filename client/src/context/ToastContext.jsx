import { CheckCircleIcon, InfoIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircleIcon, cls: 'text-success' },
  error: { icon: WarningCircleIcon, cls: 'text-danger' },
  info: { icon: InfoIcon, cls: 'text-accent-text' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (message, { tone = 'info', title, link, duration = 4500 } = {}) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((t) => [...t.slice(-3), { id, message, tone, title, link }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      show: push,
      success: (msg, opts) => push(msg, { ...opts, tone: 'success' }),
      error: (msg, opts) => push(msg, { ...opts, tone: 'error', duration: 6500 }),
      info: (msg, opts) => push(msg, { ...opts, tone: 'info' }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:right-6 md:left-auto md:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Tone = TONES[t.tone] || TONES.info;
            const Icon = Tone.icon;
            return (
              <m.div
                key={t.id}
                initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                role={t.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-lift"
              >
                <Icon size={22} weight="fill" className={`mt-0.5 shrink-0 ${Tone.cls}`} aria-hidden="true" />
                <div className="min-w-0 flex-1 text-sm">
                  {t.title && <p className="font-semibold text-ink">{t.title}</p>}
                  <p className="text-ink-2">{t.message}</p>
                  {t.link && (
                    <Link to={t.link} onClick={() => dismiss(t.id)} className="mt-1 inline-block font-semibold text-accent-text underline-offset-4 hover:underline">
                      View
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="-m-1 rounded-full p-1.5 text-muted transition-colors hover:bg-surface-3 hover:text-ink"
                  aria-label="Dismiss notification"
                >
                  <XIcon size={16} />
                </button>
              </m.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
