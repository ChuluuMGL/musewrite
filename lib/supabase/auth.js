/**
 * MuseWrite 认证服务
 *
 * 封装 Supabase Auth，支持：
 * - 邮箱登录（海外用户）
 * - 手机号登录（中国用户）
 * - OAuth 登录（Google, GitHub）
 */

const {createAdminClient, isConfigured} = require('./client');

class AuthService {
  constructor() {
    this.adminClient = createAdminClient();
  }

  /**
   * 检查服务是否可用
   */
  isAvailable() {
    return isConfigured() && this.adminClient !== null;
  }

  /**
   * 邮箱注册
   */
  async signUpWithEmail(email, password, metadata = {}) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {data, error} = await this.adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...metadata,
        region: 'global'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 手机号注册（需要 Supabase Phone Auth 配置）
   */
  async signUpWithPhone(phone, password, metadata = {}) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {data, error} = await this.adminClient.auth.admin.createUser({
      phone,
      password,
      phone_confirm: false, // 需要验证码确认
      user_metadata: {
        ...metadata,
        region: 'cn'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 发送短信验证码
   */
  async sendOtp(phone) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {data, error} = await this.adminClient.auth.signInWithOtp({
      phone
    });

    if (error) throw error;
    return data;
  }

  /**
   * 验证短信验证码
   */
  async verifyOtp(phone, token) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {data, error} = await this.adminClient.auth.verifyOtp({
      phone,
      token,
      type: 'sms'
    });

    if (error) throw error;
    return data;
  }

  /**
   * 邮箱登录
   */
  async signInWithEmail(email, password) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {data, error} = await this.adminClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  /**
   * 获取 OAuth 登录 URL
   */
  async getOAuthUrl(provider, redirectUrl) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {data, error} = await this.adminClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) throw error;
    return data.url;
  }

  /**
   * 验证 JWT Token
   */
  async verifyToken(token) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {data, error} = await this.adminClient.auth.getUser(token);

    if (error) throw error;
    return data.user;
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {data, error} = await this.adminClient.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) throw error;
    return data;
  }

  /**
   * 登出
   */
  async signOut(token) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {error} = await this.adminClient.auth.admin.signOut(token);

    if (error) throw error;
    return true;
  }

  /**
   * 获取用户信息
   */
  async getUser(userId) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {data, error} = await this.adminClient.auth.admin.getUserById(userId);

    if (error) throw error;
    return data.user;
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId, updates) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {data, error} = await this.adminClient.auth.admin.updateUserById(userId, updates);

    if (error) throw error;
    return data.user;
  }

  /**
   * 删除用户
   */
  async deleteUser(userId) {
    if (!this.isAvailable()) {
      throw new Error('认证服务未配置');
    }

    const {error} = await this.adminClient.auth.admin.deleteUser(userId);

    if (error) throw error;
    return true;
  }

  /**
   * 获取用户订阅状态
   */
  async getUserSubscription(userId) {
    if (!this.isAvailable()) {
      return {plan: 'free', status: 'active'};
    }

    const {data, error} = await this.adminClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return {plan: 'free', status: 'active'};
    }

    return data;
  }

  /**
   * 检查用户是否有足够的 tokens
   */
  async checkTokenQuota(userId, requiredTokens) {
    const subscription = await this.getUserSubscription(userId);

    if (subscription.plan === 'free') {
      // 免费用户需要自带 API Key
      return {allowed: false, reason: 'free_plan_requires_own_key'};
    }

    const tokensUsed = subscription.tokens_used || 0;
    const tokensLimit = subscription.tokens_limit || 0;

    if (tokensUsed + requiredTokens > tokensLimit) {
      return {allowed: false, reason: 'quota_exceeded'};
    }

    return {allowed: true, remaining: tokensLimit - tokensUsed};
  }

  /**
   * 记录 token 使用量
   */
  async recordTokenUsage(userId, tokens) {
    if (!this.isAvailable()) return;

    const subscription = await this.getUserSubscription(userId);

    if (subscription.plan !== 'free' && subscription.id) {
      await this.adminClient
        .from('subscriptions')
        .update({
          tokens_used: (subscription.tokens_used || 0) + tokens,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    }
  }
}

module.exports = new AuthService();
