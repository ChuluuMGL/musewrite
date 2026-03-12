/**
 * AI-Writer FormatConverter
 *
 * 功能：格式转换（Markdown → 平台格式）
 */

class FormatConverter {
  /**
   * 转换为小红书格式
   */
  toXiaohongshu(content) {
    let result = content;

    // 移除 markdown 标题
    result = result.replace(/^##\s+(.+)$/gm, '\n📱 $1\n');
    result = result.replace(/^###\s+(.+)$/gm, '\n💡 $1\n');

    // 移除粗体/斜体
    result = result.replace(/\*\*(.+?)\*\*/g, '$1');
    result = result.replace(/\*(.+?)\*/g, '$1');

    // 列表项
    result = result.replace(/^- (.+)$/gm, '• $1');
    result = result.replace(/^\* (.+)$/gm, '• $1');

    // 数字列表
    result = result.replace(/^(\d+)\.\s+(.+)$/gm, (match, num, text) => {
      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
      return `${emojis[parseInt(num) - 1] || num} ${text}`;
    });

    // 分隔线
    result = result.replace(/^---$/gm, '\n');

    // 链接
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

    // 代码块
    result = result.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```\w*\n?/g, '');
    });

    // 行内代码
    result = result.replace(/`([^`]+)`/g, '$1');

    // 清理多余空行
    result = result.replace(/\n{3,}/g, '\n\n');

    return result.trim();
  }

  /**
   * 清理标题 emoji
   */
  cleanTitle(title) {
    return title
      .replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '')
      .replace(/^[✅📝🔥⭐💡🎯⚡💪]\s*/, '')
      .trim();
  }

  /**
   * WordPress 格式（保留 Markdown）
   */
  toWordPress(content) {
    // WordPress 支持 Markdown，不需要转换
    return content;
  }

  /**
   * 根据平台转换
   */
  convert(content, platform) {
    switch (platform) {
    case 'xiaohongshu':
      return this.toXiaohongshu(content);
    case 'wordpress':
      return this.toWordPress(content);
    default:
      return content;
    }
  }
}

module.exports = FormatConverter;
