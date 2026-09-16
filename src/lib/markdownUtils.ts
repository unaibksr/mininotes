import { marked } from 'marked';

// Configure marked with sensible defaults for note-taking
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Checks if a string contains common markdown syntax patterns
 */
export function looksLikeMarkdown(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  const patterns = [
    /(^|\n)#{1,6}\s+\S+/, // Headings: # Heading
    /(^|\n)[*\-+]\s+\S+/, // Unordered lists: - item, * item
    /(^|\n)\d+\.\s+\S+/, // Ordered lists: 1. item
    /(^|\n)>\s+\S+/, // Blockquotes: > quote
    /```[\s\S]*?```/, // Code blocks
    /`[^`\n]+`/, // Inline code
    /\*\*[^*]+?\*\*/, // Bold **text**
    /__[^_]+?__/, // Bold __text__
    /(\*|_)[^*_]+?(\*|_)/, // Italic *text*
    /\[[^\]]+\]\([^)]+\)/, // Links: [text](url)
    /(^|\n)---+\s*$/, // Horizontal rule
    /(^|\n)~~[^~]+~~/, // Strikethrough
  ];

  return patterns.some((p) => p.test(text));
}

/**
 * Converts Markdown text into clean HTML for Tiptap
 */
export function markdownToHtml(markdownText: string): string {
  try {
    const rawHtml = marked.parse(markdownText, { async: false }) as string;
    return rawHtml;
  } catch (err) {
    console.warn('Error parsing markdown:', err);
    return markdownText;
  }
}

/**
 * Automatically detects and converts markdown text or mixed content in HTML
 */
export function autoConvertMarkdownInHtml(html: string): string {
  if (!html) return html;

  // Extract text representation to test if markdown exists
  const text = html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '');

  if (looksLikeMarkdown(text)) {
    return markdownToHtml(text.trim());
  }

  return html;
}

/**
 * Removes excess blank lines between texts so that at most 1 blank line remains.
 * Also collapses excessive <br> line breaks.
 */
export function removeExcessBlankLines(html: string): string {
  if (!html || typeof html !== 'string') return html;

  // 1. Collapse 2 or more consecutive empty paragraphs into at most 1 empty paragraph
  const consecutiveEmptyP = /(?:<p[^>]*>(?:\s|<br[^>]*>|&nbsp;|&#160;)*<\/p>\s*){2,}/gi;
  let result = html.replace(consecutiveEmptyP, '<p></p>');

  // 2. Collapse 3 or more consecutive <br> tags into at most 2
  result = result.replace(/(?:<br\s*[\/]?>\s*){3,}/gi, '<br><br>');

  return result;
}

