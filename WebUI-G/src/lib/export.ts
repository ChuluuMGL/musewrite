/**
 * MuseWrite 导出工具
 *
 * 支持导出为多种格式：Markdown, HTML, JSON, TXT
 */

// 定义结果类型
export interface ExportResult {
  title: string;
  content: string;
  tags: string[];
  score: number;
  feedback?: string[];
  wordCount?: number;
  imageUrl?: string;
  platformOverrides?: Record<string, {title: string; content: string; tags: string[]}>;
}

/**
 * 下载文件
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], {type: mimeType});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 导出为 Markdown
 */
export function exportAsMarkdown(result: ExportResult, platform?: string): void {
  const title =
    platform && result.platformOverrides?.[platform]?.title
      ? result.platformOverrides[platform].title
      : result.title;

  const content =
    platform && result.platformOverrides?.[platform]?.content
      ? result.platformOverrides[platform].content
      : result.content;

  const tags =
    platform && result.platformOverrides?.[platform]?.tags
      ? result.platformOverrides[platform].tags
      : result.tags;

  const markdown = `# ${title}

${content}

---

**标签**: ${tags.map((t) => `#${t}`).join(' ')}

**评分**: ${result.score}/100

---
*由 MuseWrite 生成*`;

  const filename = `${title.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
  downloadFile(markdown, filename, 'text/markdown;charset=utf-8');
}

/**
 * 导出为 HTML
 */
export function exportAsHTML(result: ExportResult, platform?: string): void {
  const title =
    platform && result.platformOverrides?.[platform]?.title
      ? result.platformOverrides[platform].title
      : result.title;

  const content =
    platform && result.platformOverrides?.[platform]?.content
      ? result.platformOverrides[platform].content
      : result.content;

  const tags =
    platform && result.platformOverrides?.[platform]?.tags
      ? result.platformOverrides[platform].tags
      : result.tags;

  // 将 Markdown 内容转换为 HTML（简单转换）
  const htmlContent = content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 {
      font-size: 2em;
      margin-bottom: 20px;
      color: #1a1a1a;
    }
    .content {
      font-size: 16px;
      line-height: 1.8;
    }
    .content p { margin-bottom: 1em; }
    .tags {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
    .tag {
      display: inline-block;
      background: #f0f0f0;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      margin-right: 8px;
      color: #666;
    }
    .meta {
      margin-top: 20px;
      font-size: 14px;
      color: #999;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>

  <div class="content">
    <p>${htmlContent}</p>
  </div>

  <div class="tags">
    ${tags.map((t) => `<span class="tag">#${t}</span>`).join('')}
  </div>

  <div class="meta">
    评分: ${result.score}/100
  </div>

  <div class="footer">
    由 MuseWrite 生成
  </div>
</body>
</html>`;

  const filename = `${title.replace(/[/\\?%*:|"<>]/g, '-')}.html`;
  downloadFile(html, filename, 'text/html;charset=utf-8');
}

/**
 * 导出为纯文本
 */
export function exportAsText(result: ExportResult, platform?: string): void {
  const title =
    platform && result.platformOverrides?.[platform]?.title
      ? result.platformOverrides[platform].title
      : result.title;

  const content =
    platform && result.platformOverrides?.[platform]?.content
      ? result.platformOverrides[platform].content
      : result.content;

  const tags =
    platform && result.platformOverrides?.[platform]?.tags
      ? result.platformOverrides[platform].tags
      : result.tags;

  const text = `${title}

${content}

标签: ${tags.map((t) => `#${t}`).join(' ')}

---
由 MuseWrite 生成`;

  const filename = `${title.replace(/[/\\?%*:|"<>]/g, '-')}.txt`;
  downloadFile(text, filename, 'text/plain;charset=utf-8');
}

/**
 * 导出为 JSON
 */
export function exportAsJSON(result: ExportResult): void {
  const json = JSON.stringify(result, null, 2);
  const filename = `${result.title.replace(/[/\\?%*:|"<>]/g, '-')}.json`;
  downloadFile(json, filename, 'application/json;charset=utf-8');
}

/**
 * 复制为 Markdown 格式
 */
export async function copyAsMarkdown(result: ExportResult, platform?: string): Promise<void> {
  const title =
    platform && result.platformOverrides?.[platform]?.title
      ? result.platformOverrides[platform].title
      : result.title;

  const content =
    platform && result.platformOverrides?.[platform]?.content
      ? result.platformOverrides[platform].content
      : result.content;

  const tags =
    platform && result.platformOverrides?.[platform]?.tags
      ? result.platformOverrides[platform].tags
      : result.tags;

  const markdown = `# ${title}

${content}

${tags.map((t) => `#${t}`).join(' ')}`;

  await navigator.clipboard.writeText(markdown);
}

/**
 * 导出格式选项
 */
export const exportFormats = [
  {id: 'markdown', name: 'Markdown', ext: '.md', handler: exportAsMarkdown},
  {id: 'html', name: 'HTML', ext: '.html', handler: exportAsHTML},
  {id: 'text', name: '纯文本', ext: '.txt', handler: exportAsText},
  {id: 'json', name: 'JSON', ext: '.json', handler: exportAsJSON}
] as const;

export type ExportFormat = (typeof exportFormats)[number]['id'];
