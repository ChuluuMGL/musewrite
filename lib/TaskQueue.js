/**
 * AI-Writer Task Queue
 *
 * 支持批量/异步任务处理
 *
 * 用法:
 *   const TaskQueue = require('./lib/TaskQueue');
 *   const queue = new TaskQueue();
 *
 *   // 添加任务
 *   const taskId = queue.addTask({
 *     type: 'generate',
 *     params: { source: '素材', platform: 'xiaohongshu' }
 *   });
 *
 *   // 查询状态
 *   const status = queue.getTaskStatus(taskId);
 */

const fs = require("fs")
const path = require("path")

class TaskQueue {
  constructor(dataDir = null) {
    this.dataDir = dataDir || path.join(__dirname, "..", "tasks")
    this.tasks = {}
    this.webhooks = []

    // 确保目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, {recursive: true})
    }

    // 加载持久化任务
    this.loadTasks()
  }

  /**
   * 添加任务
   */
  addTask(task) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.tasks[taskId] = {
      id: taskId,
      type: task.type || "generate",
      params: task.params || {},
      status: "pending", // pending / running / completed / failed
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
    }

    this.saveTasks()
    return taskId
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    const task = this.tasks[taskId]
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    return {
      id: task.id,
      status: task.status,
      type: task.type,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      progress: task.progress || 0,
    }
  }

  /**
   * 获取任务结果
   */
  getTaskResult(taskId) {
    const task = this.tasks[taskId]
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    if (task.status !== "completed") {
      throw new Error(`Task not completed: ${task.status}`)
    }

    return task.result
  }

  /**
   * 开始任务
   */
  startTask(taskId) {
    const task = this.tasks[taskId]
    if (!task) throw new Error(`Task not found: ${taskId}`)

    task.status = "running"
    task.startedAt = new Date().toISOString()
    this.saveTasks()
  }

  /**
   * 完成任务
   */
  completeTask(taskId, result) {
    const task = this.tasks[taskId]
    if (!task) throw new Error(`Task not found: ${taskId}`)

    task.status = "completed"
    task.completedAt = new Date().toISOString()
    task.result = result
    task.progress = 100

    this.saveTasks()

    // 触发 Webhook
    this.triggerWebhooks("task.completed", {taskId, result})
  }

  /**
   * 失败任务
   */
  failTask(taskId, error) {
    const task = this.tasks[taskId]
    if (!task) throw new Error(`Task not found: ${taskId}`)

    task.status = "failed"
    task.completedAt = new Date().toISOString()
    task.error = error.message || error

    this.saveTasks()

    // 触发 Webhook
    this.triggerWebhooks("task.failed", {taskId, error: task.error})
  }

  /**
   * 更新进度
   */
  updateProgress(taskId, progress, message = "") {
    const task = this.tasks[taskId]
    if (!task) throw new Error(`Task not found: ${taskId}`)

    task.progress = progress
    task.progressMessage = message
    this.saveTasks()
  }

  /**
   * 列出任务
   */
  listTasks(status = null, limit = 20) {
    let tasks = Object.values(this.tasks)

    if (status) {
      tasks = tasks.filter((t) => t.status === status)
    }

    // 按创建时间倒序
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    return tasks.slice(0, limit).map((t) => ({
      id: t.id,
      type: t.type,
      status: t.status,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      progress: t.progress || 0,
    }))
  }

  /**
   * 注册 Webhook
   */
  addWebhook(url, events = ["task.completed", "task.failed"]) {
    this.webhooks.push({url, events})
    this.saveWebhooks()
  }

  /**
   * 触发 Webhook
   */
  async triggerWebhooks(event, data) {
    for (const webhook of this.webhooks) {
      if (webhook.events.includes(event)) {
        try {
          const response = await fetch(webhook.url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({event, data, timestamp: new Date().toISOString()}),
          })
          console.log(`Webhook triggered: ${webhook.url} - ${response.status}`)
        } catch (error) {
          console.error(`Webhook failed: ${webhook.url}`, error.message)
        }
      }
    }
  }

  /**
   * 保存任务
   */
  saveTasks() {
    const tasksPath = path.join(this.dataDir, "tasks.json")
    fs.writeFileSync(tasksPath, JSON.stringify(this.tasks, null, 2))
  }

  /**
   * 加载任务
   */
  loadTasks() {
    const tasksPath = path.join(this.dataDir, "tasks.json")
    if (fs.existsSync(tasksPath)) {
      this.tasks = JSON.parse(fs.readFileSync(tasksPath, "utf-8"))
    }

    // 加载 Webhooks
    const webhooksPath = path.join(this.dataDir, "webhooks.json")
    if (fs.existsSync(webhooksPath)) {
      this.webhooks = JSON.parse(fs.readFileSync(webhooksPath, "utf-8"))
    }
  }

  /**
   * 保存 Webhooks
   */
  saveWebhooks() {
    const webhooksPath = path.join(this.dataDir, "webhooks.json")
    fs.writeFileSync(webhooksPath, JSON.stringify(this.webhooks, null, 2))
  }

  /**
   * 清理旧任务
   */
  cleanupTasks(maxAgeDays = 7) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

    let cleaned = 0
    for (const taskId of Object.keys(this.tasks)) {
      const task = this.tasks[taskId]
      if (new Date(task.completedAt || task.createdAt) < cutoffDate) {
        delete this.tasks[taskId]
        cleaned++
      }
    }

    if (cleaned > 0) {
      this.saveTasks()
      console.log(`Cleaned ${cleaned} old tasks`)
    }
  }
}

module.exports = TaskQueue
