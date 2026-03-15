/**
 * WebSocketManager - 实时推送管理器
 *
 * 支持：
 * - 草稿更新推送
 * - 任务状态推送
 * - 生成进度推送
 * - 房间隔离（多租户）
 */

const WebSocket = require('ws');
const Logger = require('./Logger');
const logger = Logger.create('WebSocket');

class WebSocketManager {
  constructor(options = {}) {
    this.port = options.port || 18063;
    this.server = null;
    this.clients = new Map();
    this.rooms = new Map();
    this.heartbeatInterval = null;

    // 事件类型
    this.Events = {
      // 草稿相关
      DRAFT_CREATED: 'draft:created',
      DRAFT_UPDATED: 'draft:updated',
      DRAFT_DELETED: 'draft:deleted',
      DRAFT_PUBLISHED: 'draft:published',

      // 任务相关
      TASK_STARTED: 'task:started',
      TASK_PROGRESS: 'task:progress',
      TASK_COMPLETED: 'task:completed',
      TASK_FAILED: 'task:failed',

      // 生成相关
      GENERATION_STARTED: 'generation:started',
      GENERATION_PROGRESS: 'generation:progress',
      GENERATION_COMPLETED: 'generation:completed',

      // 系统相关
      SYSTEM_NOTIFICATION: 'system:notification',
      SYSTEM_ALERT: 'system:alert'
    };
  }

  /**
   * 启动WebSocket服务器
   */
  start(httpServer = null) {
    if (httpServer) {
      this.server = new WebSocket.Server({server: httpServer});
    } else {
      this.server = new WebSocket.Server({port: this.port});
    }

    this.server.on('connection', (ws, req) => {
      const clientId = this._generateClientId();
      const client = {
        id: clientId,
        ws,
        rooms: new Set(),
        metadata: {
          ip: req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          connectedAt: new Date().toISOString()
        },
        isAlive: true
      };

      this.clients.set(clientId, client);
      logger.debug(`客户端连接: ${clientId} (总数: ${this.clients.size})`);

      // 发送欢迎消息
      this._send(ws, {
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this._handleMessage(clientId, message);
        } catch (_e) {
          this._send(ws, {type: 'error', message: 'Invalid JSON'});
        }
      });

      ws.on('close', () => {
        this._handleDisconnect(clientId);
      });

      ws.on('pong', () => {
        const c = this.clients.get(clientId);
        if (c) c.isAlive = true;
      });
    });

    // 心跳检测
    this.heartbeatInterval = setInterval(() => {
      this.server.clients.forEach((ws) => {
        const client = this._findClientByWs(ws);
        if (!client) return;

        if (!client.isAlive) {
          logger.debug(`客户端超时断开: ${client.id}`);
          ws.terminate();
          this._handleDisconnect(client.id);
          return;
        }

        client.isAlive = false;
        ws.ping();
      });
    }, 30000);

    logger.info(`WebSocket服务器已启动，端口: ${this.port}`);
    return this;
  }

  /**
   * 停止服务器
   */
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.server) {
      this.server.close(() => {
        logger.info('WebSocket服务器已停止');
      });
    }

    this.clients.clear();
    this.rooms.clear();
  }

  // ==================== 消息处理 ====================

  _handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
    case 'ping':
      this._send(client.ws, {type: 'pong', timestamp: Date.now()});
      break;

    case 'subscribe':
      this._subscribe(clientId, message.room);
      break;

    case 'unsubscribe':
      this._unsubscribe(clientId, message.room);
      break;

    case 'join':
      // 兼容旧版API
      this._subscribe(clientId, message.room || message.channel);
      break;

    case 'leave':
      this._unsubscribe(clientId, message.room || message.channel);
      break;

    default:
      this._send(client.ws, {type: 'error', message: `Unknown message type: ${message.type}`});
    }
  }

  _handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 从所有房间移除
    client.rooms.forEach((room) => {
      const roomClients = this.rooms.get(room);
      if (roomClients) {
        roomClients.delete(clientId);
      }
    });

    this.clients.delete(clientId);
    logger.debug(`客户端断开: ${clientId} (剩余: ${this.clients.size})`);
  }

  // ==================== 房间管理 ====================

  _subscribe(clientId, room) {
    const client = this.clients.get(clientId);
    if (!client || !room) return;

    client.rooms.add(room);

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room).add(clientId);

    this._send(client.ws, {
      type: 'subscribed',
      room,
      timestamp: new Date().toISOString()
    });

    logger.debug(`客户端 ${clientId} 订阅房间: ${room}`);
  }

  _unsubscribe(clientId, room) {
    const client = this.clients.get(clientId);
    if (!client || !room) return;

    client.rooms.delete(room);

    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
    }

    this._send(client.ws, {
      type: 'unsubscribed',
      room,
      timestamp: new Date().toISOString()
    });
  }

  // ==================== 推送方法 ====================

  /**
   * 广播到所有客户端
   */
  broadcast(event, data) {
    const message = {
      type: event,
      data,
      timestamp: new Date().toISOString()
    };

    this.server.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        this._send(ws, message);
      }
    });
  }

  /**
   * 推送到特定房间
   */
  to(room, event, data) {
    const roomClients = this.rooms.get(room);
    if (!roomClients || roomClients.size === 0) return 0;

    const message = {
      type: event,
      room,
      data,
      timestamp: new Date().toISOString()
    };

    let sent = 0;
    roomClients.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this._send(client.ws, message);
        sent++;
      }
    });

    return sent;
  }

  /**
   * 推送给特定客户端
   */
  emit(clientId, event, data) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    this._send(client.ws, {
      type: event,
      data,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  // ==================== 便捷推送方法 ====================

  /**
   * 推送草稿更新
   */
  notifyDraftUpdate(draftId, action, data = {}) {
    return this.to(`draft:${draftId}`, this.Events[`DRAFT_${action.toUpperCase()}`], {
      draftId,
      ...data
    });
  }

  /**
   * 推送任务状态
   */
  notifyTaskUpdate(taskId, status, data = {}) {
    const event = this.Events[`TASK_${status.toUpperCase()}`];
    if (!event) return 0;

    return this.to(`task:${taskId}`, event, {
      taskId,
      status,
      ...data
    });
  }

  /**
   * 推送生成进度
   */
  notifyGenerationProgress(taskId, progress, message) {
    return this.to(`task:${taskId}`, this.Events.GENERATION_PROGRESS, {
      taskId,
      progress,
      message
    });
  }

  /**
   * 推送系统通知
   */
  notifySystem(level, message, data = {}) {
    const event = level === 'alert' ? this.Events.SYSTEM_ALERT : this.Events.SYSTEM_NOTIFICATION;

    this.broadcast(event, {
      level,
      message,
      ...data
    });
  }

  // ==================== 工具方法 ====================

  _send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  _generateClientId() {
    return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _findClientByWs(ws) {
    for (const [, client] of this.clients) {
      if (client.ws === ws) return client;
    }
    return null;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      clients: this.clients.size,
      rooms: this.rooms.size,
      roomDetails: Object.fromEntries(
        [...this.rooms].map(([name, clients]) => [name, clients.size])
      )
    };
  }

  /**
   * 获取WebSocket URL
   */
  getUrl() {
    return `ws://localhost:${this.port}`;
  }
}

// 单例
let wsInstance = null;

function getWebSocket(options = {}) {
  if (!wsInstance) {
    wsInstance = new WebSocketManager(options);
  }
  return wsInstance;
}

module.exports = {
  WebSocketManager,
  getWebSocket
};
