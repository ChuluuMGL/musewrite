/**
 * MuseWrite 统一支付接口
 *
 * 支持多种支付方式：
 * - 支付宝（中国用户）
 * - 微信支付（中国用户）
 * - Stripe（海外用户）
 */

const alipay = require('./alipay');
const wechat = require('./wechat');
const stripe = require('./stripe');

// 订阅计划配置
const PLANS = {
  free: {
    name: '免费版',
    nameEn: 'Free',
    price: 0,
    priceCny: 0,
    priceUsd: 0,
    tokens: 0,
    features: ['自带 API Key', '本地存储', '功能完整'],
    cloudSync: false
  },
  pro: {
    name: '专业版',
    nameEn: 'Pro',
    price: 4900, // 分
    priceCny: 49,
    priceUsd: 9,
    tokens: 1000000, // 100万 tokens
    features: ['100万 tokens/月', '云同步', '多设备', '优先支持'],
    cloudSync: true,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    alipayProductId: 'musewrite_pro_monthly'
  },
  team: {
    name: '团队版',
    nameEn: 'Team',
    price: 19900, // 分
    priceCny: 199,
    priceUsd: 39,
    tokens: 5000000, // 500万 tokens
    features: ['500万 tokens/月', '团队协作', '共享素材库', '专属客服'],
    cloudSync: true,
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID,
    alipayProductId: 'musewrite_team_monthly'
  }
};

/**
 * 获取可用计划
 */
function getPlans() {
  return PLANS;
}

/**
 * 获取计划详情
 */
function getPlan(planId) {
  return PLANS[planId] || null;
}

/**
 * 创建支付订单
 * @param {string} planId - 计划ID
 * @param {string} userId - 用户ID
 * @param {string} region - 用户地区 'cn' | 'global'
 * @param {string} method - 支付方式 'alipay' | 'wechat' | 'stripe'
 */
async function createPayment(planId, userId, region, method = null) {
  const plan = getPlan(planId);
  if (!plan) {
    throw new Error('Invalid plan');
  }

  if (planId === 'free') {
    throw new Error('Cannot pay for free plan');
  }

  // 根据地区自动选择支付方式
  if (!method) {
    method = region === 'cn' ? 'alipay' : 'stripe';
  }

  // 创建订单ID
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let paymentResult;

  switch (method) {
    case 'alipay':
      paymentResult = await alipay.createOrder({
        orderId,
        userId,
        planId,
        amount: plan.priceCny,
        subject: `MuseWrite ${plan.name} - 月度订阅`
      });
      break;

    case 'wechat':
      paymentResult = await wechat.createOrder({
        orderId,
        userId,
        planId,
        amount: plan.priceCny,
        body: `MuseWrite ${plan.name} - 月度订阅`
      });
      break;

    case 'stripe':
      paymentResult = await stripe.createCheckoutSession({
        orderId,
        userId,
        planId,
        amount: plan.priceUsd,
        name: `MuseWrite ${plan.nameEn}`,
        priceId: plan.stripePriceId
      });
      break;

    default:
      throw new Error(`Unsupported payment method: ${method}`);
  }

  return {
    orderId,
    planId,
    method,
    ...paymentResult
  };
}

/**
 * 验证支付回调
 */
async function verifyCallback(method, data) {
  switch (method) {
    case 'alipay':
      return alipay.verifyCallback(data);
    case 'wechat':
      return wechat.verifyCallback(data);
    case 'stripe':
      return stripe.verifyWebhook(data);
    default:
      throw new Error(`Unsupported payment method: ${method}`);
  }
}

/**
 * 查询订单状态
 */
async function queryOrder(method, orderId) {
  switch (method) {
    case 'alipay':
      return alipay.queryOrder(orderId);
    case 'wechat':
      return wechat.queryOrder(orderId);
    case 'stripe':
      return stripe.querySubscription(orderId);
    default:
      throw new Error(`Unsupported payment method: ${method}`);
  }
}

/**
 * 取消订阅
 */
async function cancelSubscription(method, subscriptionId) {
  switch (method) {
    case 'stripe':
      return stripe.cancelSubscription(subscriptionId);
    default:
      throw new Error(`Subscription cancellation not supported for: ${method}`);
  }
}

/**
 * 检查支付配置是否完整
 */
function checkPaymentConfig() {
  return {
    alipay: !!(process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY),
    wechat: !!(process.env.WECHAT_APP_ID && process.env.WECHAT_MCH_ID && process.env.WECHAT_API_KEY),
    stripe: !!(process.env.STRIPE_SECRET_KEY)
  };
}

module.exports = {
  getPlans,
  getPlan,
  createPayment,
  verifyCallback,
  queryOrder,
  cancelSubscription,
  checkPaymentConfig,
  PLANS
};
