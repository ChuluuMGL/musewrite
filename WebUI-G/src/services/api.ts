import { GoogleGenAI } from "@google/genai";

// 这里的 API Key 处理逻辑将来可以迁移到后端，目前保持与 App.tsx 一致以防功能中断
const GEMINI_API_KEY = (process.env as any).GEMINI_API_KEY || '';

export interface GenerationParams {
  source: string;
  platform?: string;
  info?: string;
  style?: string;
  image?: boolean;
}

export interface GenerationResponse {
  success: boolean;
  draft: {
    title: string;
    content: string;
    tags: string[];
    platform?: string;
    account?: string;
  };
  quality?: {
    score: number;
    issues: string[];
    warnings: string[];
  };
  imageUrl?: string;
  filename?: string;
}

/**
 * MuseWrite API Service
 * 封装前端与后端的通讯逻辑
 */
class ApiService {
  private baseUrl = '/api/v1';
  private apiKey = 'sk_19460aec9b98d695176e10bdbdf43156';

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };
  }

  /**
   * 优先尝试调用本地后端 API，如果失败则回退到直接调用 Gemini (保持现状兼容性)
   */
  async generateContent(params: GenerationParams): Promise<GenerationResponse> {
    try {
      // 1. 尝试连接 MuseWrite 后端
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(params)
      });

      if (response.ok) {
        const result = await response.json();
        // 适配后端返回格式到前端使用的格式
        return {
          success: true,
          draft: result.draft,
          quality: result.quality,
          imageUrl: result.image ? `/drafts/images/${result.image.filename}` : undefined,
          filename: result.filename
        };
      }
    } catch (error) {
      console.warn('后端服务未启动或连接失败，正在切换至备用直接生成模式...', error);
    }

    // 2. 备用模式：直接调用 Gemini (保持 WebUI-G 目前的独立逻辑)
    return this.fallbackGenerate(params);
  }

  private async fallbackGenerate(params: GenerationParams): Promise<GenerationResponse> {
    if (!GEMINI_API_KEY) {
      throw new Error('API_KEY_MISSING');
    }

    const genAI = new GoogleGenAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
      请根据以下信息创作内容：
      素材：${params.source}
      平台：${params.platform || '通用'}
      风格：${params.style || '默认'}
      
      请以 JSON 格式返回结果，包含 title, content, tags (数组), score (0-100), wordCount 字段。
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
    const data = JSON.parse(jsonStr);

    return {
      success: true,
      draft: {
        title: data.title,
        content: data.content,
        tags: data.tags
      },
      quality: {
        score: data.score || 80,
        issues: [],
        warnings: []
      }
    };
  }

  /**
   * 获取历史草稿
   */
  async getDrafts() {
    try {
      const response = await fetch(`${this.baseUrl}/drafts`, { headers: this.headers });
      if (response.ok) return await response.json();
    } catch (e) {
      return { success: false, drafts: [] };
    }
  }

  /**
   * 获取可用人设卡/账号
   */
  async getAccounts() {
    try {
      const response = await fetch(`${this.baseUrl}/accounts`, { headers: this.headers });
      if (response.ok) return await response.json();
    } catch (e) {
      console.error('Failed to fetch accounts:', e);
    }
    return { success: false, accounts: [] };
  }

  /**
   * 获取可用平台规格
   */
  async getPlatforms() {
    try {
      const response = await fetch(`${this.baseUrl}/platforms`, { headers: this.headers });
      if (response.ok) return await response.json();
    } catch (e) {
      console.error('Failed to fetch platforms:', e);
    }
    return { success: false, platforms: { domestic: [], international: [] } };
  }

  /**
   * 获取可用风格列表
   */
  async getStyles() {
    try {
      const response = await fetch(`${this.baseUrl}/styles`, { headers: this.headers });
      if (response.ok) return await response.json();
    } catch (e) {
      console.error('Failed to fetch styles:', e);
    }
    return { success: false, styles: [] };
  }

  /**
   * 检查连接状态
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/status`, { headers: this.headers });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
}

export const apiService = new ApiService();
