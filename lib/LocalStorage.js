/**
 * LocalStorage - 本地存储持久化模块
 *
 * 支持数据本地持久化，后续可扩展 iCloud 同步
 * 数据结构：
 * - personas/    人设卡
 * - styles/      风格卡
 * - drafts/      草稿
 * - settings/    设置
 * - cache/       缓存
 */

const fs = require('fs');
const path = require('path');

class LocalStorage {
  /**
   * 初始化本地存储
   * @param {string} basePath - 存储根目录，默认为项目 data 目录
   * @param {object} options - 配置选项
   */
  constructor(basePath = null, options = {}) {
    this.basePath = basePath || path.join(__dirname, '..', 'data');
    this.options = {
      autoSave: true, // 自动保存
      backupEnabled: true, // 启用备份
      maxBackups: 5, // 最大备份数
      prettyJson: true, // JSON 格式化
      ...options
    };

    // 子目录
    this.dirs = {
      personas: path.join(this.basePath, 'personas'),
      styles: path.join(this.basePath, 'styles'),
      drafts: path.join(this.basePath, 'drafts'),
      settings: path.join(this.basePath, 'settings'),
      cache: path.join(this.basePath, 'cache'),
      backups: path.join(this.basePath, 'backups')
    };

    this._initialized = false;
  }

  /**
   * 初始化存储目录
   */
  init() {
    if (this._initialized) return this;

    // 创建所有目录
    Object.values(this.dirs).forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true});
      }
    });

    // 初始化设置文件
    const settingsFile = path.join(this.dirs.settings, 'app.json');
    if (!fs.existsSync(settingsFile)) {
      this._writeJson(settingsFile, {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        defaultPersona: null,
        defaultStyle: null,
        platforms: ['xiaohongshu', 'douyin', 'wechat'],
        theme: 'light',
        language: 'zh-CN'
      });
    }

    this._initialized = true;
    console.log('✅ LocalStorage 初始化完成:', this.basePath);
    return this;
  }

  // ==================== 人设卡 (Personas) ====================

  /**
   * 获取所有人设卡
   */
  listPersonas() {
    this._ensureInit();
    const dir = this.dirs.personas;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    return files.map((f) => {
      const data = this._readJson(path.join(dir, f));
      return {id: f.replace('.json', ''), ...data};
    });
  }

  /**
   * 获取单个人设卡
   */
  getPersona(id) {
    this._ensureInit();
    const file = path.join(this.dirs.personas, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    return {id, ...this._readJson(file)};
  }

  /**
   * 保存人设卡
   */
  savePersona(id, data) {
    this._ensureInit();
    const file = path.join(this.dirs.personas, `${id}.json`);
    const payload = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    this._writeJson(file, payload);
    return {id, ...payload};
  }

  /**
   * 删除人设卡
   */
  deletePersona(id) {
    this._ensureInit();
    const file = path.join(this.dirs.personas, `${id}.json`);
    if (fs.existsSync(file)) {
      // 备份后删除
      if (this.options.backupEnabled) {
        this._backup(file, 'personas');
      }
      fs.unlinkSync(file);
      return true;
    }
    return false;
  }

  // ==================== 风格卡 (Styles) ====================

  /**
   * 获取所有风格卡
   */
  listStyles() {
    this._ensureInit();
    const dir = this.dirs.styles;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    return files.map((f) => {
      const data = this._readJson(path.join(dir, f));
      return {id: f.replace('.json', ''), ...data};
    });
  }

  /**
   * 获取单个风格卡
   */
  getStyle(id) {
    this._ensureInit();
    const file = path.join(this.dirs.styles, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    return {id, ...this._readJson(file)};
  }

  /**
   * 保存风格卡
   */
  saveStyle(id, data) {
    this._ensureInit();
    const file = path.join(this.dirs.styles, `${id}.json`);
    const payload = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    this._writeJson(file, payload);
    return {id, ...payload};
  }

  /**
   * 删除风格卡
   */
  deleteStyle(id) {
    this._ensureInit();
    const file = path.join(this.dirs.styles, `${id}.json`);
    if (fs.existsSync(file)) {
      if (this.options.backupEnabled) {
        this._backup(file, 'styles');
      }
      fs.unlinkSync(file);
      return true;
    }
    return false;
  }

  // ==================== 草稿 (Drafts) ====================

  /**
   * 获取草稿列表
   * @param {object} options - 筛选选项
   */
  listDrafts(options = {}) {
    this._ensureInit();
    const dir = this.dirs.drafts;
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

    // 按日期分组
    if (options.groupByDate) {
      const grouped = {};
      files.forEach((f) => {
        const data = this._readJson(path.join(dir, f));
        const date = (data.createdAt || '').split('T')[0] || 'unknown';
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push({id: f.replace('.json', ''), ...data});
      });
      return grouped;
    }

    // 分页
    const page = options.page || 1;
    const limit = options.limit || 20;
    const start = (page - 1) * limit;

    const drafts = files.slice(start, start + limit).map((f) => {
      const data = this._readJson(path.join(dir, f));
      return {id: f.replace('.json', ''), ...data};
    });

    return {
      data: drafts,
      total: files.length,
      page,
      limit,
      hasMore: start + limit < files.length
    };
  }

  /**
   * 获取单个草稿
   */
  getDraft(id) {
    this._ensureInit();
    const file = path.join(this.dirs.drafts, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    return {id, ...this._readJson(file)};
  }

  /**
   * 保存草稿
   */
  saveDraft(data) {
    this._ensureInit();
    const id = data.id || `draft-${Date.now()}`;
    const file = path.join(this.dirs.drafts, `${id}.json`);

    // 读取现有版本历史
    const existing = fs.existsSync(file) ? this._readJson(file) : {};
    const versions = existing.versions || [];

    // 如果内容变化，保存版本
    if (existing.content && existing.content !== data.content) {
      versions.push({
        version: versions.length + 1,
        content: existing.content,
        savedAt: existing.updatedAt || existing.createdAt
      });
      // 保留最近10个版本
      while (versions.length > 10) {
        versions.shift();
      }
    }

    const payload = {
      ...data,
      id,
      versions,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || new Date().toISOString()
    };

    this._writeJson(file, payload);
    return payload;
  }

  /**
   * 删除草稿
   */
  deleteDraft(id) {
    this._ensureInit();
    const file = path.join(this.dirs.drafts, `${id}.json`);
    if (fs.existsSync(file)) {
      if (this.options.backupEnabled) {
        this._backup(file, 'drafts');
      }
      fs.unlinkSync(file);
      return true;
    }
    return false;
  }

  /**
   * 搜索草稿
   */
  searchDrafts(query, options = {}) {
    this._ensureInit();
    const dir = this.dirs.drafts;
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const results = [];

    const q = query.toLowerCase();

    for (const f of files) {
      const data = this._readJson(path.join(dir, f));

      // 搜索标题和内容
      const titleMatch = (data.title || '').toLowerCase().includes(q);
      const contentMatch = (data.content || '').toLowerCase().includes(q);
      const tagMatch = (data.tags || []).some((t) => t.toLowerCase().includes(q));

      if (titleMatch || contentMatch || tagMatch) {
        results.push({
          id: f.replace('.json', ''),
          ...data,
          _match: {
            title: titleMatch,
            content: contentMatch,
            tags: tagMatch
          }
        });
      }

      // 限制结果数
      if (results.length >= (options.limit || 50)) break;
    }

    return results;
  }

  // ==================== 设置 (Settings) ====================

  /**
   * 获取应用设置
   */
  getSettings() {
    this._ensureInit();
    const file = path.join(this.dirs.settings, 'app.json');
    return this._readJson(file);
  }

  /**
   * 更新应用设置
   */
  updateSettings(updates) {
    this._ensureInit();
    const file = path.join(this.dirs.settings, 'app.json');
    const current = this._readJson(file);
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this._writeJson(file, updated);
    return updated;
  }

  /**
   * 获取用户偏好
   */
  getPreference(key, defaultValue = null) {
    const settings = this.getSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }

  /**
   * 设置用户偏好
   */
  setPreference(key, value) {
    return this.updateSettings({[key]: value});
  }

  // ==================== 缓存 (Cache) ====================

  /**
   * 获取缓存
   */
  getCache(key) {
    this._ensureInit();
    const file = path.join(this.dirs.cache, `${key}.json`);
    if (!fs.existsSync(file)) return null;

    const data = this._readJson(file);

    // 检查过期
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      fs.unlinkSync(file);
      return null;
    }

    return data.value;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   */
  setCache(key, value, ttl = 3600) {
    this._ensureInit();
    const file = path.join(this.dirs.cache, `${key}.json`);
    const data = {
      value,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
    };
    this._writeJson(file, data);
    return true;
  }

  /**
   * 清除缓存
   */
  clearCache(key = null) {
    this._ensureInit();
    const dir = this.dirs.cache;

    if (key) {
      const file = path.join(dir, `${key}.json`);
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } else {
      // 清除所有缓存
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      files.forEach((f) => fs.unlinkSync(path.join(dir, f)));
    }
    return true;
  }

  // ==================== 导入导出 ====================

  /**
   * 导出所有数据
   */
  exportAll() {
    this._ensureInit();
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      personas: this.listPersonas(),
      styles: this.listStyles(),
      drafts: this.listDrafts({limit: 1000}).data,
      settings: this.getSettings()
    };
    return exportData;
  }

  /**
   * 导入数据
   */
  importAll(data, options = {merge: true}) {
    this._ensureInit();

    if (data.personas) {
      data.personas.forEach((p) => {
        const id = p.id;
        delete p.id;
        this.savePersona(id, p);
      });
    }

    if (data.styles) {
      data.styles.forEach((s) => {
        const id = s.id;
        delete s.id;
        this.saveStyle(id, s);
      });
    }

    if (data.drafts) {
      data.drafts.forEach((d) => {
        const id = d.id;
        delete d.id;
        this.saveDraft({...d, id});
      });
    }

    if (data.settings && !options.merge) {
      this.updateSettings(data.settings);
    }

    return true;
  }

  /**
   * 导入 Markdown 文件为人设/风格卡
   */
  importMarkdown(filePath, type = 'persona') {
    this._ensureInit();

    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // 解析 Markdown front matter 和内容
    const result = {
      name: '',
      description: '',
      examples: '',
      rawContent: content
    };

    // 提取标题 (第一个 # 开头的行)
    const titleLine = lines.find((l) => l.startsWith('# '));
    if (titleLine) {
      result.name = titleLine.replace('# ', '').trim();
    }

    // 提取内容
    let inExample = false;
    const contentLines = [];

    for (const line of lines) {
      if (line.startsWith('# ')) continue; // 跳过标题

      // 检测示例区域
      if (line.toLowerCase().includes('示例') || line.toLowerCase().includes('example')) {
        inExample = true;
        continue;
      }

      if (inExample) {
        result.examples += `${line}\n`;
      } else {
        contentLines.push(line);
      }
    }

    result.description = contentLines.join('\n').trim();

    // 生成 ID
    const id =
      result.name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '') || `imported-${Date.now()}`;

    // 保存
    if (type === 'persona') {
      return this.savePersona(id, {
        name: result.name,
        description: result.description,
        examples: result.examples
      });
    } else if (type === 'style') {
      return this.saveStyle(id, {
        name: result.name,
        description: result.description,
        examples: result.examples
      });
    }

    return {id, ...result};
  }

  // ==================== 备份恢复 ====================

  /**
   * 创建完整备份
   */
  createBackup() {
    this._ensureInit();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.dirs.backups, timestamp);

    fs.mkdirSync(backupDir, {recursive: true})

    // 复制所有数据
    ;['personas', 'styles', 'drafts', 'settings'].forEach((dir) => {
      const srcDir = this.dirs[dir];
      const destDir = path.join(backupDir, dir);

      if (fs.existsSync(srcDir)) {
        fs.mkdirSync(destDir, {recursive: true});
        const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.json'));
        files.forEach((f) => {
          fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
        });
      }
    });

    // 写入备份信息
    this._writeJson(path.join(backupDir, 'backup-info.json'), {
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    });

    // 清理旧备份
    this._cleanupBackups();

    console.log(`✅ 备份创建成功: ${backupDir}`);
    return backupDir;
  }

  /**
   * 列出所有备份
   */
  listBackups() {
    this._ensureInit();
    const dir = this.dirs.backups;
    if (!fs.existsSync(dir)) return [];

    const backups = fs
      .readdirSync(dir)
      .filter((d) => {
        const infoFile = path.join(dir, d, 'backup-info.json');
        return fs.existsSync(infoFile);
      })
      .map((d) => {
        const info = this._readJson(path.join(dir, d, 'backup-info.json'));
        return {
          id: d,
          createdAt: info.createdAt,
          version: info.version
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return backups;
  }

  /**
   * 从备份恢复
   */
  restoreFromBackup(backupId) {
    this._ensureInit();
    const backupDir = path.join(this.dirs.backups, backupId);

    if (!fs.existsSync(backupDir)) {
      throw new Error(`备份不存在: ${backupId}`);
    }

    // 先创建当前状态的备份
    this.createBackup()

    // 恢复数据
    ;['personas', 'styles', 'drafts', 'settings'].forEach((dir) => {
      const srcDir = path.join(backupDir, dir);
      const destDir = this.dirs[dir];

      // 清空目标目录
      if (fs.existsSync(destDir)) {
        const files = fs.readdirSync(destDir);
        files.forEach((f) => fs.unlinkSync(path.join(destDir, f)));
      } else {
        fs.mkdirSync(destDir, {recursive: true});
      }

      // 复制备份数据
      if (fs.existsSync(srcDir)) {
        const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.json'));
        files.forEach((f) => {
          fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
        });
      }
    });

    console.log(`✅ 从备份恢复成功: ${backupId}`);
    return true;
  }

  // ==================== iCloud 同步支持（预留接口）====================

  /**
   * 获取 iCloud 存储路径
   * macOS: ~/Library/Mobile Documents/com~apple~CloudDocs/MuseWrite/
   */
  getiCloudPath() {
    const home = process.env.HOME || process.env.USERPROFILE;
    return path.join(home, 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'MuseWrite');
  }

  /**
   * 检查 iCloud 是否可用
   */
  isiCloudAvailable() {
    const iCloudPath = this.getiCloudPath();
    return fs.existsSync(iCloudPath);
  }

  /**
   * 启用 iCloud 同步
   */
  enableiCloudSync() {
    const iCloudPath = this.getiCloudPath();

    if (!fs.existsSync(iCloudPath)) {
      fs.mkdirSync(iCloudPath, {recursive: true});
    }

    // 创建符号链接或复制数据
    // 注意：实际实现需要更复杂的同步逻辑
    this.updateSettings({
      iCloudEnabled: true,
      iCloudPath: iCloudPath
    });

    console.log('✅ iCloud 同步已启用:', iCloudPath);
    return iCloudPath;
  }

  /**
   * 同步到 iCloud
   */
  syncToiCloud() {
    if (!this.getPreference('iCloudEnabled')) {
      throw new Error('iCloud 同步未启用');
    }

    const _iCloudPath = this.getiCloudPath();
    // TODO: 实现增量同步逻辑
    console.log('⏳ 同步到 iCloud...');
    return true;
  }

  // ==================== 工具方法 ====================

  _ensureInit() {
    if (!this._initialized) {
      this.init();
    }
  }

  _readJson(file) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error(`读取 JSON 失败: ${file}`, e.message);
      return {};
    }
  }

  _writeJson(file, data) {
    const content = this.options.prettyJson ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    fs.writeFileSync(file, content, 'utf-8');
  }

  _backup(file, category) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.dirs.backups, 'auto', category);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, {recursive: true});
    }

    const filename = path.basename(file);
    const backupFile = path.join(backupDir, `${timestamp}-${filename}`);

    fs.copyFileSync(file, backupFile);
  }

  _cleanupBackups() {
    const dir = this.dirs.backups;
    if (!fs.existsSync(dir)) return;

    const backups = fs
      .readdirSync(dir)
      .filter((d) => {
        const stat = fs.statSync(path.join(dir, d));
        return stat.isDirectory();
      })
      .sort()
      .reverse();

    // 保留最近的 N 个备份
    while (backups.length > this.options.maxBackups) {
      const oldBackup = backups.pop();
      const oldDir = path.join(dir, oldBackup);
      fs.rmSync(oldDir, {recursive: true});
    }
  }

  /**
   * 获取存储统计信息
   */
  getStats() {
    this._ensureInit();

    const countFiles = (dir) => {
      if (!fs.existsSync(dir)) return 0;
      return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).length;
    };

    const getDirSize = (dir) => {
      if (!fs.existsSync(dir)) return 0;
      const files = fs.readdirSync(dir);
      return files.reduce((size, f) => {
        const stat = fs.statSync(path.join(dir, f));
        return size + stat.size;
      }, 0);
    };

    return {
      personas: {
        count: countFiles(this.dirs.personas),
        size: getDirSize(this.dirs.personas)
      },
      styles: {
        count: countFiles(this.dirs.styles),
        size: getDirSize(this.dirs.styles)
      },
      drafts: {
        count: countFiles(this.dirs.drafts),
        size: getDirSize(this.dirs.drafts)
      },
      cache: {
        count: countFiles(this.dirs.cache),
        size: getDirSize(this.dirs.cache)
      },
      backups: {
        count: this.listBackups().length,
        size: getDirSize(this.dirs.backups)
      },
      totalSize: getDirSize(this.basePath)
    };
  }
}

module.exports = LocalStorage;
