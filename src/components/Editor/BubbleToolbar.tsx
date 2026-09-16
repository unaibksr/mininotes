import React from 'react';
import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Italic, Heading2, List } from 'lucide-react';

interface BubbleToolbarProps {
  editor: Editor | null;
}

export const BubbleToolbar: React.FC<BubbleToolbarProps> = ({ editor }) => {
  if (!editor || !editor.isEditable) return null;

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-1 shadow-xl backdrop-blur-md text-slate-700 dark:text-slate-200 z-40"
    >
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Format Bold"
        data-active={editor.isActive('bold') ? 'true' : undefined}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          editor.isActive('bold')
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold'
            : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'
        }`}
      >
        <Bold className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Format Italic"
        data-active={editor.isActive('italic') ? 'true' : undefined}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          editor.isActive('italic')
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-medium'
            : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'
        }`}
      >
        <Italic className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-label="Heading 2"
        data-active={editor.isActive('heading', { level: 2 }) ? 'true' : undefined}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          editor.isActive('heading', { level: 2 })
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
            : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'
        }`}
      >
        <Heading2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet List"
        data-active={editor.isActive('bulletList') ? 'true' : undefined}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          editor.isActive('bulletList')
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
            : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'
        }`}
      >
        <List className="w-4 h-4" />
      </button>
    </BubbleMenu>
  );
};
