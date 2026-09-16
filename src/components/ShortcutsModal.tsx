import React from 'react';
import { X, Keyboard, Command, Wand2 } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutGroups = [
    {
      title: 'App & Navigation',
      items: [
        { label: 'New Note', keys: [`${modKey}`, 'N'] },
        { label: 'Focus Search', keys: [`${modKey}`, 'K'] },
        { label: 'Toggle Full Screen', keys: ['F11'] },
        { label: 'Toggle Zen Mode', keys: [`${modKey}`, 'Shift', 'F'] },
        { label: 'Back to Notes List', keys: ['Esc'] },
        { label: 'Shortcuts Cheat Sheet', keys: ['?'] },
      ],
    },
    {
      title: 'Markdown Typing Shortcuts (Auto-converted)',
      items: [
        { label: 'Heading 1', keys: ['#', 'Space'] },
        { label: 'Heading 2', keys: ['##', 'Space'] },
        { label: 'Heading 3', keys: ['###', 'Space'] },
        { label: 'Bullet List', keys: ['-', 'Space'] },
        { label: 'Numbered List', keys: ['1.', 'Space'] },
        { label: 'Blockquote', keys: ['>', 'Space'] },
        { label: 'Code Block', keys: ['```', 'Enter'] },
        { label: 'Paste Markdown', keys: ['Auto-converts to rich text'] },
      ],
    },
    {
      title: 'Rich Formatting & Editing',
      items: [
        { label: 'Undo', keys: [`${modKey}`, 'Z'] },
        { label: 'Redo', keys: [`${modKey}`, 'Y'] },
        { label: 'Clean Extra Blank Lines', keys: ['Clean Lines button'] },
        { label: 'Bold', keys: [`${modKey}`, 'B'] },
        { label: 'Italic', keys: [`${modKey}`, 'I'] },
        { label: 'Heading 1', keys: [`${modKey}`, 'Alt', '1'] },
        { label: 'Heading 2', keys: [`${modKey}`, 'Alt', '2'] },
        { label: 'Heading 3', keys: [`${modKey}`, 'Alt', '3'] },
        { label: 'Bullet List', keys: [`${modKey}`, 'Shift', '8'] },
        { label: 'Numbered List', keys: [`${modKey}`, 'Shift', '9'] },
        { label: 'Code Block', keys: [`${modKey}`, 'Alt', 'C'] },
        { label: 'Blockquote', keys: [`${modKey}`, 'Shift', 'B'] },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="shortcuts-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Keyboard & Markdown Shortcuts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Speed up writing and formatting without touching the mouse
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 text-xs"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 shadow-2xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
            Markdown automatically converts to formatted text on paste
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium transition cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
