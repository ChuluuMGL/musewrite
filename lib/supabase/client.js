/**
 * MuseWrite Supabase 客户端配置
 *
 * 用于后端服务端调用 Supabase
 */

const {createClient} = require('@supabase/supabase-js');

// 环境变量
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️  Supabase 配置缺失，用户认证功能不可用');
}

/**
 * 服务端客户端（使用 service_role key，有完全权限）
 * 仅用于后端操作，不要暴露给前端
 */
function createServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * 管理员客户端（用于用户管理操作）
 */
function createAdminClient() {
  return createServiceClient();
}

/**
 * 获取 Supabase 配置（供前端使用）
 */
function getConfig() {
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
  };
}

/**
 * 检查 Supabase 是否配置正确
 */
function isConfigured() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

module.exports = {
  createServiceClient,
  createAdminClient,
  getConfig,
  isConfigured
};
