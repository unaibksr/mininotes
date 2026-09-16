import React, { useState, useRef, useEffect } from 'react';
import {
  Share2,
  FileDown,
  Copy,
  Printer,
  FileText,
  Check,
} from 'lucide-react';
import { Note } from '../../types';
import {
  htmlToMarkdown,
  htmlToPlainText,
  downloadFile,
  printCurrentNote,
} from '../../lib/exportUtils';

interface ExportMenuProps {
  note: Note;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ note }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const sanitizedTitle = (note.title || 'Untitled')
    .replace(/[^a-z0-9_\-\s]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();

  const handleExportMarkdown = () => {
    const md = htmlToMarkdown(note.title, note.content);
    downloadFile(`${sanitizedTitle || 'note'}.md`, md, 'text/markdown');
    setIsOpen(false);
  };

  const handleExportText = () => {
    const txt = htmlToPlainText(note.title, note.content);
    downloadFile(`${sanitizedTitle || 'note'}.txt`, txt, 'text/plain');
    setIsOpen(false);
  };

  const handleCopyMarkdown = async () => {
    const md = htmlToMarkdown(note.title, note.content);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1200);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handlePrint = () => {
    setIsOpen(false);
    setTimeout(() => {
      printCurrentNote();
    }, 150);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Export or share note"
        title="Export or share"
        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Export</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-xs text-slate-700 dark:text-slate-200"
        >
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-500" />
            <span>Download Markdown (.md)</span>
          </button>

          <button
            type="button"
            onClick={handleExportText}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Download Text (.txt)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy as Markdown</span>
              </>
            )}
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />

          <button
            type="button"
            onClick={handlePrint}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};
