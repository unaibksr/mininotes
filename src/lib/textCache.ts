/**
 * Ultra-fast, bounded memory text extraction & search cache for notes.
 * Completely eliminates repetitive HTML regex stripping on render & search.
 */

const plainTextCache = new Map<string, string>();
const snippetCache = new Map<string, string>();
const MAX_CACHE_SIZE = 600;

function trimCacheIfFull(cache: Map<string, string>) {
  if (cache.size > MAX_CACHE_SIZE) {
    // Evict oldest 20% of entries to keep memory bounded and small
    const keys = Array.from(cache.keys());
    for (let i = 0; i < 120; i++) {
      cache.delete(keys[i]);
    }
  }
}

/**
 * Fast HTML-to-plain-text stripper with caching
 */
export function getCachedPlainText(id: string, updatedAt: number, html: string): string {
  const key = `${id}:${updatedAt}`;
  const cached = plainTextCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  // Fast HTML tag stripper
  const text = (html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  trimCacheIfFull(plainTextCache);
  plainTextCache.set(key, text);
  return text;
}

/**
 * Fast snippet generator with caching
 */
export function getCachedSnippet(
  id: string,
  updatedAt: number,
  html: string,
  searchQuery?: string
): string {
  const cleanQ = searchQuery ? searchQuery.trim().toLowerCase() : '';
  const key = `${id}:${updatedAt}:${cleanQ}`;
  const cached = snippetCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const plain = getCachedPlainText(id, updatedAt, html);
  if (!plain) {
    return 'Empty note';
  }

  if (cleanQ) {
    const idx = plain.toLowerCase().indexOf(cleanQ);
    if (idx > 30) {
      const start = Math.max(0, idx - 20);
      const res = '...' + plain.substring(start, start + 95);
      trimCacheIfFull(snippetCache);
      snippetCache.set(key, res);
      return res;
    }
  }

  const res = plain.slice(0, 95);
  trimCacheIfFull(snippetCache);
  snippetCache.set(key, res);
  return res;
}
