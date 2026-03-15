/**
 * MuseWrite 微信支付集成
 *
 * 使用微信支付 Native Pay（扫码支付）
 */

const crypto = require('crypto');

// 配置
const config = {
  appId: process.env.WECHAT_APP_ID,
  mchId: process.env.WECHAT_MCH_ID,
  apiKey: process.env.WECHAT_API_KEY,
  notifyUrl: process.env.WECHAT_NOTIFY_URL,
  // 证书路径（用于退款等操作）
  certPath: process.env.WECHAT_CERT_PATH,
  keyPath: process.env.WECHAT_KEY_PATH
};

/**
 * 检查是否配置完整
 */
function isConfigured() {
  return !!(config.appId && config.mchId && config.apiKey);
}

/**
 * 生成随机字符串
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

  // 拼接 API Key
  const stringSignTemp = `${sortedParams}&key=${config.apiKey}`;

  // MD5 签名
  return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
}

/**
 * 验证签名
 */
function verifySign(params) {
  if (!config.apiKey) return false;

  const sign = params.sign;
  if (!sign) return false;

  const calculatedSign = generateSign(params);
  return calculatedSign === sign;
}

/**
 * 创建支付订单（Native Pay）
 */
async function createOrder(options) {
  const {orderId, userId, planId, amount, body} = options;

  if (!isConfigured()) {
    throw new Error('微信支付未配置');
  }

  const params = {
    appid: config.appId,
    mch_id: config.mchId,
    nonce_str: generateNonceStr(),
    body: body,
    out_trade_no: orderId,
    total_fee: amount, // 分
    spbill_create_ip: '127.0.0.1', // 服务器 IP
    notify_url: config.notifyUrl,
    trade_type: 'NATIVE',
    attach: JSON.stringify({userId, planId})
  };

  params.sign = generateSign(params);

  // 构建请求 XML
  const xml = buildXml(params);

  // 调用微信支付统一下单接口
  const response = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
    method: 'POST',
    body: xml,
    headers: {
      'Content-Type': 'application/xml'
    }
  });

  const responseText = await response.text();
  const result = parseXml(responseText);

  if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
    throw new Error(result.return_msg || result.err_code_des || '创建订单失败');
  }

  return {
    codeUrl: result.code_url, // 二维码链接
    orderId,
    method: 'wechat'
  };
}

/**
 * 验证回调
 */
function verifyCallback(xmlData) {
  const params = parseXml(xmlData);

  if (!verifySign(params)) {
    return {success: false, error: '签名验证失败'};
  }

  if (params.return_code !== 'SUCCESS' || params.result_code !== 'SUCCESS') {
    return {success: false, error: '交易未成功'};
  }

  const attach = JSON.parse(params.attach || '{}');

  return {
    success: true,
    orderId: params.out_trade_no,
    transactionId: params.transaction_id,
    amount: parseInt(params.total_fee),
    userId: attach.userId,
    planId: attach.planId
  };
}

/**
 * 查询订单状态
 */
async function queryOrder(orderId) {
  if (!isConfigured()) {
    throw new Error('微信支付未配置');
  }

  const params = {
    appid: config.appId,
    mch_id: config.mchId,
    out_trade_no: orderId,
    nonce_str: generateNonceStr()
  };

  params.sign = generateSign(params);

  const xml = buildXml(params);

  const response = await fetch('https://api.mch.weixin.qq.com/pay/orderquery', {
    method: 'POST',
    body: xml,
    headers: {
      'Content-Type': 'application/xml'
    }
  });

  const responseText = await response.text();
  const result = parseXml(responseText);

  if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
    return {
      success: false,
      error: result.return_msg || result.err_code_des || '查询失败'
    };
  }

  return {
    success: true,
    orderId: result.out_trade_no,
    transactionId: result.transaction_id,
    tradeState: result.trade_state,
    amount: parseInt(result.total_fee)
  };
}

/**
 * 构建请求 XML
 */
function buildXml(params) {
  let xml = '<xml>';
  for (const key in params) {
    if (params[key] !== undefined) {
      xml += `<${key}><![CDATA[${params[key]}]]></${key}>`;
    }
  }
  xml += '</xml>';
  return xml;
}

/**
 * 解析响应 XML
 */
function parseXml(xml) {
  const result = {};
  const regex = /<(\w+)>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/\1>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    result[match[1]] = match[2] || match[3] || '';
  }
  return result;
}

module.exports = {
  isConfigured,
  createOrder,
  verifyCallback,
  queryOrder
};
