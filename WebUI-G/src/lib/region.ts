/**
 * MuseWrite 地区检测（前端）
 *
 * 检测用户地区，决定显示哪些登录/支付方式
 */

export type Region = 'cn' | 'global';

export interface RegionInfo {
  region: Region;
  country: string;
  ip: string;
  availableLoginMethods: string[];
  availablePaymentMethods: string[];
}

let cachedRegion: RegionInfo | null = null;

/**
 * 获取用户地区信息
 */
export async function getRegionInfo(): Promise<RegionInfo> {
  if (cachedRegion) {
    return cachedRegion;
  }

  try {
    const response = await fetch('/api/v1/auth/region');
    const {data} = await response.json();
    cachedRegion = data;
    return data;
  } catch (error) {
    console.error('获取地区信息失败:', error);
    // 默认返回海外
    return {
      region: 'global',
      country: 'Unknown',
      ip: 'Unknown',
      availableLoginMethods: ['email', 'google', 'github'],
      availablePaymentMethods: ['stripe']
    };
  }
}

/**
 * 检测是否是中国用户
 */
export async function isChineseUser(): Promise<boolean> {
  const info = await getRegionInfo();
  return info.region === 'cn';
}

/**
 * 获取可用的登录方式
 */
export async function getAvailableLoginMethods(): Promise<string[]> {
  const info = await getRegionInfo();
  return info.availableLoginMethods;
}

/**
 * 获取可用的支付方式
 */
export async function getAvailablePaymentMethods(): Promise<string[]> {
  const info = await getRegionInfo();
  return info.availablePaymentMethods;
}

/**
 * 清除缓存（用于测试）
 */
export function clearRegionCache(): void {
  cachedRegion = null;
}
