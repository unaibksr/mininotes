/**
 * Export and sharing utilities for Minimalist Notes
 */

export function htmlToMarkdown(title: string, html: string): string {
  let md = `# ${title || 'Untitled'}\n\n`;

  // Temporary DOM parser for clean conversion
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = html;

    function processNode(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const childText = Array.from(el.childNodes).map(processNode).join('');

      switch (tag) {
        case 'h1':
          return `# ${childText}\n\n`;
        case 'h2':
          return `## ${childText}\n\n`;
        case 'h3':
          return `### ${childText}\n\n`;
        case 'p':
          return `${childText}\n\n`;
        case 'strong':
        case 'b':
          return `**${childText}**`;
        case 'em':
        case 'i':
          return `*${childText}*`;
        case 'ul':
          return `${childText}\n`;
        case 'ol':
          return `${childText}\n`;
        case 'li':
          return `- ${childText}\n`;
        case 'blockquote':
          return `> ${childText.trim()}\n\n`;
        case 'pre':
          return `\`\`\`\n${childText.trim()}\n\`\`\`\n\n`;
        case 'code':
          if (el.parentElement?.tagName.toLowerCase() === 'pre') {
            return childText;
          }
          return `\`${childText}\``;
        case 'br':
          return '\n';
        default:
          return childText;
      }
    }

    const bodyMd = Array.from(div.childNodes).map(processNode).join('');
    md += bodyMd.trim();
  } else {
    md += html.replace(/<[^>]+>/g, '');
  }

  return md;
}

export function htmlToPlainText(title: string, html: string): string {
  const plain = html
    .replace(/<h1>/gi, '\n\n# ')
    .replace(/<h2>/gi, '\n\n## ')
    .replace(/<h3>/gi, '\n\n### ')
    .replace(/<li>/gi, '\n• ')
    .replace(/<p>/gi, '\n\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  return `${title ? `${title}\n${'='.repeat(title.length)}\n\n` : ''}${plain}`;
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printCurrentNote() {
  window.print();
}
