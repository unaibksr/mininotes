import React, { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel = 'Undo',
  onAction,
  onDismiss,
  durationMs = 6000,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationMs);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, durationMs - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [durationMs, onDismiss]);

  const percent = (timeLeft / durationMs) * 100;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col overflow-hidden rounded-xl bg-slate-900/95 text-white dark:bg-slate-800/95 dark:text-slate-100 shadow-2xl border border-slate-700/50 backdrop-blur-md min-w-[280px] max-w-sm"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm font-medium">{message}</span>
        <div className="flex items-center gap-2">
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 hover:bg-blue-500 px-2.5 py-1 text-xs font-semibold text-white transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{actionLabel}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close notification"
            className="text-slate-400 hover:text-white p-1 rounded-md transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Progress countdown bar */}
      <div className="h-1 w-full bg-slate-800 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-100 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
