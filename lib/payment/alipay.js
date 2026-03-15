/**
 * MuseWrite 支付宝支付集成
 *
 * 使用支付宝电脑网站支付 API
 */

const crypto = require('crypto');

// 配置
const config = {
  appId: process.env.ALIPAY_APP_ID,
  privateKey: process.env.ALIPAY_PRIVATE_KEY,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
  gateway: 'https://openapi.alipay.com/gateway.do',
  notifyUrl: process.env.ALIPAY_NOTIFY_URL,
  returnUrl: process.env.ALIPAY_RETURN_URL
};

/**
 * 检查是否配置完整
 */
function isConfigured() {
  return !!(config.appId && config.privateKey);
}

/**
 * 生成签名
 */
function generateSign(params) {
  // 排序参数
  const sortedParams = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== '' && key !== 'sign')
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  // RSA2 签名
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(sortedParams);
  return sign.sign(config.privateKey, 'base64');
}

/**
 * 验证签名
 */
function verifySign(params) {
  if (!config.alipayPublicKey) return false;

  const sign = params.sign;
  const signType = params.sign_type;
  if (!sign) return false;

  // 排序参数（不含 sign 和 sign_type）
  const sortedParams = Object.keys(params)
    .filter(key => key !== 'sign' && key !== 'sign_type' && params[key] !== undefined && params[key] !== '')
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  const verify = crypto.createVerify(signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1');
  verify.update(sortedParams);

  return verify.verify(config.alipayPublicKey, sign, 'base64');
}

/**
 * 构建请求 URL
 */
function buildRequestUrl(params) {
  const sign = generateSign(params);
  const urlParams = new URLSearchParams({
    ...params,
    sign,
    sign_type: 'RSA2'
  });
  return `${config.gateway}?${urlParams.toString()}`;
}

/**
 * 创建支付订单
 */
async function createOrder(options) {
  const {orderId, userId, planId, amount, subject} = options;

  if (!isConfigured()) {
    throw new Error('支付宝未配置');
  }

  const params = {
    app_id: config.appId,
    method: 'alipay.trade.page.pay',
    format: 'JSON',
    return_url: config.returnUrl,
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().format('yyyy-MM-dd HH:mm:ss'),
    version: '1.0',
    notify_url: config.notifyUrl,
    biz_content: JSON.stringify({
      out_trade_no: orderId,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: (amount / 100).toFixed(2), // 分转元
      subject: subject,
      passback_params: JSON.stringify({userId, planId})
    })
  };

  const payUrl = buildRequestUrl(params);

  return {
    payUrl,
    orderId,
    method: 'alipay'
  };
}

/**
 * 验证回调
 */
function verifyCallback(params) {
  if (!verifySign(params)) {
    return {success: false, error: '签名验证失败'};
  }

  if (params.trade_status !== 'TRADE_SUCCESS' && params.trade_status !== 'TRADE_FINISHED') {
    return {success: false, error: '交易未成功'};
  }

  const passbackParams = JSON.parse(params.passback_params || '{}');

  return {
    success: true,
    orderId: params.out_trade_no,
    tradeNo: params.trade_no,
    amount: parseFloat(params.total_amount) * 100, // 元转分
    userId: passbackParams.userId,
    planId: passbackParams.planId
  };
}

/**
 * 查询订单状态
 */
async function queryOrder(orderId) {
  if (!isConfigured()) {
    throw new Error('支付宝未配置');
  }

  const params = {
    app_id: config.appId,
    method: 'alipay.trade.query',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace('T', ' ').substr(0, 19),
    version: '1.0',
    biz_content: JSON.stringify({
      out_trade_no: orderId
    })
  };

  const url = buildRequestUrl(params);

  const response = await fetch(url);
  const data = await response.json();

  const result = data.alipay_trade_query_response;

  if (result.code !== '10000') {
    return {
      success: false,
      error: result.msg || '查询失败'
    };
  }

  return {
    success: true,
    orderId: result.out_trade_no,
    tradeNo: result.trade_no,
    tradeStatus: result.trade_status,
    amount: parseFloat(result.total_amount) * 100
  };
}

// 日期格式化辅助
Date.prototype.format = function(fmt) {
  const o = {
    'M+': this.getMonth() + 1,
    'd+': this.getDate(),
    'H+': this.getHours(),
    'm+': this.getMinutes(),
    's+': this.getSeconds()
  };
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length));
  }
  for (const k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
    }
  }
  return fmt;
};

module.exports = {
  isConfigured,
  createOrder,
  verifyCallback,
  queryOrder
};
