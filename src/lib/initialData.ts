import { Note, Folder } from '../types';

export const INITIAL_FOLDERS: Folder[] = [
  {
    id: 'folder-ideas',
    name: 'Ideas',
    color: 'sky',
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
    deleted: false,
    synced: false,
  },
  {
    id: 'folder-work',
    name: 'Work',
    color: 'indigo',
    updatedAt: Date.now() - 1000 * 60 * 60 * 4,
    deleted: false,
    synced: false,
  },
  {
    id: 'folder-personal',
    name: 'Personal',
    color: 'emerald',
    updatedAt: Date.now() - 1000 * 60 * 60 * 6,
    deleted: false,
    synced: false,
  },
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-welcome',
    title: 'Welcome to Minimalist Notes 🌿',
    content: `<h1>Distraction-Free Thought Space</h1>
<p>Minimalist Notes is designed to be <strong>lightning-fast</strong>, calm, and distraction-free. Select any text to reveal the <em>floating BubbleMenu</em>.</p>
<h2>Key Capabilities</h2>
<ul>
<li><strong>Rich Text with Tiptap:</strong> Headings, lists, quotes, and code blocks.</li>
<li><strong>IndexedDB Offline:</strong> Works seamlessly even without an internet connection.</li>
<li><strong>Supabase Cloud Sync:</strong> Auth-free anon sync across all your devices.</li>
<li><strong>Installable PWA:</strong> Add to Home Screen for a native mobile experience.</li>
</ul>
<h3>Distinct Heading Hierarchy</h3>
<p>Notice how H1 renders in <strong>blue</strong>, H2 in <strong>indigo</strong>, and H3 in <strong>teal</strong> (with soft pastels in dark mode). In dark mode, bold text shines in subtle <strong>light yellow</strong>.</p>
<blockquote>"Simplicity is the ultimate sophistication." — Leonardo da Vinci</blockquote>
<pre><code>// Fast, typed, and resilient
const note = { offlineFirst: true, autosaveMs: 800 };</code></pre>`,
    updatedAt: Date.now(),
    folderId: 'folder-ideas',
    pinned: true,
    tags: [],
    deleted: false,
    synced: false,
  },
  {
    id: 'note-pwa-tips',
    title: 'Mobile PWA & Touch Gestures 📱',
    content: `<h2>Everyday Gestures</h2>
<p>On mobile phones and tablets, you can:</p>
<ul>
<li><strong>Swipe Left:</strong> Swipe left on any note card in the list to reveal the quick delete button.</li>
<li><strong>Undo:</strong> Did you delete something by accident? A 6-second undo toast lets you restore it immediately.</li>
<li><strong>Bottom Navigation:</strong> Effortlessly switch between notes and folder view, or cycle light/dark themes.</li>
</ul>
<p>Try installing this app by tapping the <em>Install</em> button above!</p>`,
    updatedAt: Date.now() - 1000 * 60 * 30,
    folderId: 'folder-personal',
    pinned: false,
    tags: [],
    deleted: false,
    synced: false,
  },
];
