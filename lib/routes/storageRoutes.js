/**
 * Storage Routes - 本地存储API路由
 *
 * 处理人设、风格、草稿、设置的CRUD操作
 */

const fs = require('fs');
const path = require('path');

// 简单的本地存储实现（替代LocalStorage模块）
class SimpleStorage {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.dataPath = path.join(rootPath, 'data');
    this._ensureDirs();
  }

  _ensureDirs() {
    const dirs = ['personas', 'styles', 'drafts', 'settings'];
    dirs.forEach((dir) => {
      const fullPath = path.join(this.dataPath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, {recursive: true});
      }
    });
  }

  // 人设管理
  listPersonas() {
    const dir = path.join(this.dataPath, 'personas');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    return files.map((f) => {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      return {id: f.replace('.json', ''), ...JSON.parse(content)};
    });
  }

  getPersona(id) {
    const filePath = path.join(this.dataPath, 'personas', `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  savePersona(id, data) {
    const filePath = path.join(this.dataPath, 'personas', `${id}.json`);
    data.updatedAt = new Date().toISOString();
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return this.getPersona(id);
  }

  deletePersona(id) {
    const filePath = path.join(this.dataPath, 'personas', `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  // 风格管理
  listStyles() {
    const dir = path.join(this.dataPath, 'styles');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    return files.map((f) => {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      return {id: f.replace('.json', ''), ...JSON.parse(content)};
    });
  }

  getStyle(id) {
    const filePath = path.join(this.dataPath, 'styles', `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  saveStyle(id, data) {
    const filePath = path.join(this.dataPath, 'styles', `${id}.json`);
    data.updatedAt = new Date().toISOString();
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return this.getStyle(id);
  }

  deleteStyle(id) {
    const filePath = path.join(this.dataPath, 'styles', `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  // 设置管理
  getSettings() {
    const filePath = path.join(this.dataPath, 'settings', 'app.json');
    if (!fs.existsSync(filePath)) {
      return this._defaultSettings();
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  updateSettings(updates) {
    const settings = {...this.getSettings(), ...updates};
    const filePath = path.join(this.dataPath, 'settings', 'app.json');
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
    return settings;
  }

  _defaultSettings() {
    return {
      defaultPlatform: 'xiaohongshu',
      defaultPersona: 'stone',
      defaultStyle: 'casual',
      llmProvider: 'openai',
      imageGeneration: false,
      autoSave: true,
      theme: 'system',
      language: 'zh-CN',
      createdAt: new Date().toISOString()
    };
  }

  // 备份与恢复
  createBackup() {
    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      personas: this.listPersonas(),
      styles: this.listStyles(),
      settings: this.getSettings()
    };

    const backupDir = path.join(this.dataPath, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, {recursive: true});
    }

    const filename = `backup-${Date.now()}.json`;
    fs.writeFileSync(path.join(backupDir, filename), JSON.stringify(backup, null, 2));

    return {
      id: filename.replace('.json', ''),
      createdAt: backup.createdAt,
      size: JSON.stringify(backup).length
    };
  }

  listBackups() {
    const backupDir = path.join(this.dataPath, 'backups');
    if (!fs.existsSync(backupDir)) return [];

    return fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const content = JSON.parse(fs.readFileSync(path.join(backupDir, f), 'utf-8'));
        return {
          id: f.replace('.json', ''),
          createdAt: content.createdAt,
          size: fs.statSync(path.join(backupDir, f)).size
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  restoreBackup(backupId) {
    const backupDir = path.join(this.dataPath, 'backups');
    const filePath = path.join(backupDir, `${backupId}.json`);
    if (!fs.existsSync(filePath)) return false;

    const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 恢复人设
    if (backup.personas) {
      backup.personas.forEach((p) => {
        if (p.id) this.savePersona(p.id, p);
      });
    }

    // 恢复风格
    if (backup.styles) {
      backup.styles.forEach((s) => {
        if (s.id) this.saveStyle(s.id, s);
      });
    }

    // 恢复设置
    if (backup.settings) {
      this.updateSettings(backup.settings);
    }

    return true;
  }

  // 导出
  exportData(_format = 'json') {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      personas: this.listPersonas(),
      styles: this.listStyles(),
      settings: this.getSettings()
    };

    return data;
  }

  importData(data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;

      if (parsed.personas) {
        parsed.personas.forEach((p) => {
          if (p.id) this.savePersona(p.id, p);
        });
      }

      if (parsed.styles) {
        parsed.styles.forEach((s) => {
          if (s.id) this.saveStyle(s.id, s);
        });
      }

      if (parsed.settings) {
        this.updateSettings(parsed.settings);
      }

      return {success: true};
    } catch (e) {
      return {success: false, error: e.message};
    }
  }
}

module.exports = function (rootPath) {
  const storage = new SimpleStorage(rootPath);

  return {
    // 人设
    'GET /api/v1/storage/personas': (req, res, _params) => {
      const personas = storage.listPersonas();
      res.writeHead(200);
      res.end(JSON.stringify({success: true, personas, count: personas.length}));
    },

    'POST /api/v1/storage/personas': async (req, res, params, body) => {
      if (!body.name) {
        res.writeHead(400);
        res.end(JSON.stringify({success: false, error: 'name is required'}));
        return;
      }
      const id = body.id || `persona-${Date.now()}`;
      const persona = storage.savePersona(id, body);
      res.writeHead(201);
      res.end(JSON.stringify({success: true, persona}));
    },

    'GET /api/v1/storage/personas/:id': (req, res, params) => {
      const persona = storage.getPersona(params.id);
      if (!persona) {
        res.writeHead(404);
        res.end(JSON.stringify({success: false, error: 'Persona not found'}));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({success: true, persona}));
    },

    'PUT /api/v1/storage/personas/:id': (req, res, params, body) => {
      const persona = storage.savePersona(params.id, body);
      res.writeHead(200);
      res.end(JSON.stringify({success: true, persona}));
    },

    'DELETE /api/v1/storage/personas/:id': (req, res, params) => {
      const deleted = storage.deletePersona(params.id);
      res.writeHead(deleted ? 204 : 404);
      if (!deleted) {
        res.end(JSON.stringify({success: false, error: 'Persona not found'}));
      }
    },

    // 风格
    'GET /api/v1/storage/styles': (req, res, _params) => {
      const styles = storage.listStyles();
      res.writeHead(200);
      res.end(JSON.stringify({success: true, styles, count: styles.length}));
    },

    'GET /api/v1/storage/styles/:id': (req, res, params) => {
      const style = storage.getStyle(params.id);
      if (!style) {
        res.writeHead(404);
        res.end(JSON.stringify({success: false, error: 'Style not found'}));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({success: true, style}));
    },

    'PUT /api/v1/storage/styles/:id': (req, res, params, body) => {
      const style = storage.saveStyle(params.id, body);
      res.writeHead(200);
      res.end(JSON.stringify({success: true, style}));
    },

    'DELETE /api/v1/storage/styles/:id': (req, res, params) => {
      const deleted = storage.deleteStyle(params.id);
      res.writeHead(deleted ? 204 : 404);
      if (!deleted) {
        res.end(JSON.stringify({success: false, error: 'Style not found'}));
      }
    },

    // 设置
    'GET /api/v1/storage/settings': (req, res, _params) => {
      const settings = storage.getSettings();
      res.writeHead(200);
      res.end(JSON.stringify({success: true, settings}));
    },

    'PATCH /api/v1/storage/settings': (req, res, params, body) => {
      const settings = storage.updateSettings(body);
      res.writeHead(200);
      res.end(JSON.stringify({success: true, settings}));
    },

    // 备份
    'POST /api/v1/storage/backup': (req, res, _params) => {
      const backup = storage.createBackup();
      res.writeHead(201);
      res.end(JSON.stringify({success: true, backup}));
    },

    'GET /api/v1/storage/backup': (req, res, _params) => {
      const backups = storage.listBackups();
      res.writeHead(200);
      res.end(
        JSON.stringify({success: true, backups: backups || [], count: (backups || []).length})
      );
    },

    'POST /api/v1/storage/backup/:id/restore': (req, res, params) => {
      const restored = storage.restoreBackup(params.id);
      if (restored) {
        res.writeHead(200);
        res.end(JSON.stringify({success: true, message: 'Backup restored'}));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({success: false, error: 'Backup not found'}));
      }
    },

    // 导出
    'GET /api/v1/storage/export': (req, res, _params) => {
      const data = storage.exportData();
      res.writeHead(200);
      res.end(JSON.stringify(data));
    },

    // 导入
    'POST /api/v1/storage/import': (req, res, params, body) => {
      const result = storage.importData(body);
      res.writeHead(result.success ? 200 : 400);
    }
  };
};
