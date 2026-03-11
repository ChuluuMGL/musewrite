/**
 * Luna 集成 AI-Writer 示例
 * 
 * 用法:
 *   node examples/luna-integration.js
 */

const fetch = require('node-fetch');

class LunaIntegration {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:18062';
    this.apiKey = options.apiKey || process.env.AIWRITER_API_KEY;
    this.agentName = 'luna';
  }

  /**
   * 生成每日总结
   */
  async generateDailySummary(miniSummary, asukaSummary) {
    const source = `Mini 总结：${miniSummary}\n\nAsuka 总结：${asukaSummary}`;
    
    return await this._generate({
      source,
      platform: 'feishu',
      info: 'luna'
    });
  }

  /**
   * 生成小红书内容
   */
  async generateXiaohongshu(source, account = 'stone') {
    return await this._generate({
      source,
      platform: 'xiaohongshu',
      info: account
    });
  }

  /**
   * 通用生成方法
   */
  async _generate(params) {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'X-Agent-Name': this.agentName
        },
        body: JSON.stringify({
          ...params,
          checkFeedback: true
        })
      });

      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || '生成失败');
      }

      return {
        success: true,
        draft: data.draft,
        quality: data.quality,
        filename: data.filename
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 添加反馈
   */
  async addFeedback(draft, problem, suggestion) {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          draft,
          problem,
          suggestion,
          type: 'feishu',
          account: 'luna'
        })
      });

      const data = await res.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 查询反馈
   */
  async listFeedback(days = 7) {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/feedback?days=${days}`, {
        headers: {
          'X-API-Key': this.apiKey
        }
      });

      return await res.json();
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 测试
async function test() {
  console.log('🌙 Luna 集成测试\n');

  const luna = new LunaIntegration({
    apiKey: process.env.AIWRITER_API_KEY || 'sk_19460aec9f6f16871b7ec36d2f14d01e'
  });

  // 测试 1: 生成每日总结
  console.log('1️⃣  生成每日总结...');
  const summary = await luna.generateDailySummary(
    '完成了 AI-Writer v0.6.0 开发',
    '完成了 RED-Fabric 测试'
  );
  console.log(`   结果：${summary.success ? '✅ 成功' : '❌ 失败'}`);
  if (summary.success) {
    console.log(`   标题：${summary.draft.title}`);
    console.log(`   质量：${summary.quality.score}分`);
  }

  // 测试 2: 生成小红书内容
  console.log('\n2️⃣  生成小红书内容...');
  const xhs = await luna.generateXiaohongshu('今天测试了 AI-Writer 企业级版本');
  console.log(`   结果：${xhs.success ? '✅ 成功' : '❌ 失败'}`);
  if (xhs.success) {
    console.log(`   标题：${xhs.draft.title}`);
  }

  // 测试 3: 查询反馈
  console.log('\n3️⃣  查询反馈...');
  const feedbacks = await luna.listFeedback(7);
  console.log(`   结果：${feedbacks.count} 条反馈`);

  console.log('\n✅ Luna 集成测试完成\n');
}

// 导出
module.exports = { LunaIntegration };

// 运行测试
if (require.main === module) {
  test();
}
