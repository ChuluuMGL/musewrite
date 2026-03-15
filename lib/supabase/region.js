/**
 * MuseWrite 地区检测服务
 *
 * 根据 IP 检测用户地区，用于：
 * - 显示不同的登录方式
 * - 选择不同的支付方式
 */

// 中国 IP 地址段（简化版，实际应使用完整数据库）
const _CN_IP_RANGES = [
  // 这里只是示例，实际应使用完整的 IP 数据库
  // 如 https://github.com/lionsoul2014/ip2region
];

/**
 * 获取客户端 IP
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

/**
 * 检测 IP 是否来自中国
 * 实际生产环境应该使用 IP 数据库服务
 */
async function isChineseIp(ip) {
  // 本地开发环境
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return true; // 开发环境默认为中国
  }

  // 使用免费的 IP 地理位置 API
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
    const data = await response.json();
    return data.countryCode === 'CN';
  } catch (error) {
    console.error('IP 检测失败:', error.message);
    // 检测失败时默认为海外
    return false;
  }
}

/**
 * 获取用户地区信息
 */
async function getRegionInfo(req) {
  const ip = getClientIp(req);
  const isCn = await isChineseIp(ip);

  return {
    ip,
    region: isCn ? 'cn' : 'global',
    country: isCn ? 'CN' : 'Unknown',
    availableLoginMethods: isCn
      ? ['phone', 'wechat']
      : ['email', 'google', 'github'],
    availablePaymentMethods: isCn
      ? ['alipay', 'wechat_pay']
      : ['stripe']
  };
}

/**
 * 中间件：添加地区信息到请求
 */
function regionMiddleware(req, res, next) {
  getRegionInfo(req)
    .then((info) => {
      req.region = info;
      next();
    })
    .catch((error) => {
      console.error('地区检测失败:', error);
      req.region = {
        ip: getClientIp(req),
        region: 'global',
        country: 'Unknown',
        availableLoginMethods: ['email', 'google', 'github'],
        availablePaymentMethods: ['stripe']
      };
      next();
    });
}

module.exports = {
  getClientIp,
  isChineseIp,
  getRegionInfo,
  regionMiddleware
};
