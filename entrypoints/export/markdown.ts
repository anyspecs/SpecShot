export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, function(match, content) {
      return content.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    })
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function formatMarkdownMetadata(url: string, platform: string): string {
  return `# Conversation extracted from ${url}\n**Platform:** ${platform}\n**Format:** markdown\n\n`;
}

export function formatMarkdownMessage(speaker: string, text: string): string {
  return `## ${speaker}:\n${text}\n\n`;
}

export function downloadMarkdown(content: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `conversation_${timestamp}.md`;
  
  // 注释掉自动下载功能
  // const blob = new Blob([content], { type: 'text/plain' });
  // const url = URL.createObjectURL(blob);
  // const a = document.createElement('a');
  // a.href = url;
  // a.download = filename;
  // a.click();
  // URL.revokeObjectURL(url);
  
  return filename;
}