/**
 * AI-Writer CLI Utilities
 * Enhanced terminal interaction with colors and progress indicators
 */

const readline = require('readline');

// ANSI Color codes
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

// Emojis for status indicators
const EMOJIS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  robot: '🤖',
  writing: '📝',
  image: '🎨',
  publish: '📤',
  chart: '📊',
  folder: '📁',
  check: '🔍',
  rocket: '🚀',
};

class CLIUtils {
  /**
   * Print colored text
   */
  static color(text, colorName) {
    const code = COLORS[colorName] || '';
    return `${code}${text}${COLORS.reset}`;
  }

  /**
   * Print with emoji and color
   */
  static emoji(emojiName, text, colorName = 'white') {
    const emoji = EMOJIS[emojiName] || '';
    return this.color(`${emoji} ${text}`, colorName);
  }

  /**
   * Print section header
   */
  static header(title) {
    const width = 60;
    const padding = Math.floor((width - title.length) / 2);
    const line = '═'.repeat(width);

    console.log();
    console.log(this.color(line, 'cyan'));
    console.log(this.color('║', 'cyan') + ' '.repeat(padding) + this.color(title, 'bold') + ' '.repeat(padding) + this.color('║', 'cyan'));
    console.log(this.color(line, 'cyan'));
    console.log();
  }

  /**
   * Print success message
   */
  static success(text) {
    console.log(this.emoji('success', text, 'green'));
  }

  /**
   * Print error message
   */
  static error(text) {
    console.log(this.emoji('error', text, 'red'));
  }

  /**
   * Print warning message
   */
  static warning(text) {
    console.log(this.emoji('warning', text, 'yellow'));
  }

  /**
   * Print info message
   */
  static info(text) {
    console.log(this.emoji('info', text, 'blue'));
  }

  /**
   * Print a simple progress bar
   */
  static progress(current, total, label = 'Progress') {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * 30);
    const empty = 30 - filled;

    const bar = this.color('█'.repeat(filled), 'green') + this.color('░'.repeat(empty), 'gray');
    const percent = this.color(`${percentage}%`, 'white');

    process.stdout.write(`\r${this.emoji('info', label, 'cyan')} [${bar}] ${percent}`);
  }

  /**
   * Print a spinner animation
   */
  static async spinner(text, duration = 2000) {
    const frames = ['⠋', '⠙', '⠹', '⠼'];
    const startTime = Date.now();

    const interval = setInterval(() => {
      const frameIndex = Math.floor((Date.now() - startTime) / 150) % frames.length;
      const frame = frames[frameIndex % frames.length];
      process.stdout.write(`\r${frame} ${text}...`);
    }, 150);

    await new Promise(resolve => setTimeout(resolve, duration));

    clearInterval(interval);
    process.stdout.write(`\r${this.emoji('success', `${text} complete!`, 'green')}\n`);
  }

  /**
   * Print a table
   */
  static table(headers, rows) {
    // Calculate column widths
    const widths = headers.map((h, i) => {
      const maxRowLength = Math.max(...rows.map(r => String(r[i] || '').length));
      return Math.max(h.length, maxRowLength);
    });

    // Build header row
    const headerRow = headers.map((h, i) => {
      const width = widths[i];
      return this.color(h.padEnd(width), 'bold');
    }).join(' │ ');

    // Build separator
    const separator = widths.map(w => '─'.repeat(w + 2)).join('─');

    // Build rows
    const dataRows = rows.map(row => {
      return headers.map((_, i) => {
        const width = widths[i];
        return String(row[i] || '').padEnd(width);
      }).join(' │ ');
    });

    console.log();
    console.log(this.color(separator, 'gray'));
    console.log(headerRow);
    console.log(this.color(separator, 'gray'));
    dataRows.forEach(row => console.log(row));
    console.log(this.color(separator, 'gray'));
    console.log();
  }

  /**
   * Ask a yes/no question
   */
  static async confirm(message) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
    process.stdout.write(`${this.emoji('warning', `${message} (y/n)`, 'yellow')} `);
    rl.question('', (answer) => {
    rl.close();
    resolve(answer.toLowerCase() === 'y');
    });
  });
  }

  /**
   * Select from multiple choices
   */
  static async select(message, choices) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
    console.log(`\n${this.emoji('info', message, 'cyan')}`);
    choices.forEach((choice, i) => {
      console.log(`  ${this.color(`[${i + 1}]`, 'blue')} ${choice}`);
    });
    process.stdout.write(`\n${this.emoji('info', 'Select: 'yellow')} `);

    rl.question('', (answer) => {
      rl.close();
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < choices.length) {
        resolve(choices[index]);
      } else {
        resolve(null);
      }
    });
  });
  }

  /**
   * Format file size
   */
  static formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Format duration
   */
  static formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Clear console
   */
  static clear() {
    console.clear();
  }
}

module.exports = CLIUtils;
