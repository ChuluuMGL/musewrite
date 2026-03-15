/**
 * MuseWrite 定价页面
 *
 * 显示订阅计划和支付选项
 */

import React, {useState, useEffect} from 'react';
import {Check, Zap, Users, Crown} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  nameEn: string;
  priceCny: number;
  priceUsd: number;
  tokens: number;
  features: string[];
  cloudSync: boolean;
  popular?: boolean;
}

interface PricingPageProps {
  region: 'cn' | 'global';
  onSelectPlan: (planId: string) => void;
  currentPlan?: string;
}

export function PricingPage({region, onSelectPlan, currentPlan}: PricingPageProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/v1/payment/plans');
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('获取计划失败:', error);
      // 使用默认计划
      setPlans([
        {
          id: 'free',
          name: '免费版',
          nameEn: 'Free',
          priceCny: 0,
          priceUsd: 0,
          tokens: 0,
          features: ['自带 API Key', '本地存储', '功能完整'],
          cloudSync: false
        },
        {
          id: 'pro',
          name: '专业版',
          nameEn: 'Pro',
          priceCny: 49,
          priceUsd: 9,
          tokens: 1000000,
          features: ['100万 tokens/月', '云同步', '多设备', '优先支持'],
          cloudSync: true,
          popular: true
        },
        {
          id: 'team',
          name: '团队版',
          nameEn: 'Team',
          priceCny: 199,
          priceUsd: 39,
          tokens: 5000000,
          features: ['500万 tokens/月', '团队协作', '共享素材库', '专属客服'],
          cloudSync: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (plan: Plan) => {
    if (plan.priceCny === 0) return '免费';
    const price = region === 'cn' ? plan.priceCny : plan.priceUsd;
    const currency = region === 'cn' ? '¥' : '$';
    const yearlyDiscount = billingPeriod === 'yearly' ? 0.8 : 1;
    return `${currency}${Math.round(price * yearlyDiscount)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens === 0) return '无限（自带API Key）';
    if (tokens >= 1000000) return `${tokens / 1000000}万`;
    return tokens.toLocaleString();
  };

  const getIcon = (planId: string) => {
    switch (planId) {
      case 'pro':
        return <Zap className="w-6 h-6" />;
      case 'team':
        return <Users className="w-6 h-6" />;
      default:
        return <Crown className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* 标题 */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          选择适合你的计划
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          所有功能都可用，选择适合你的方式
        </p>
      </div>

      {/* 计费周期切换 */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            月付
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'yearly'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            年付
            <span className="ml-1 text-xs text-green-500">省20%</span>
          </button>
        </div>
      </div>

      {/* 计划卡片 */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border-2 p-6 transition-all ${
              plan.popular
                ? 'border-blue-500 shadow-lg shadow-blue-500/10'
                : 'border-gray-200 dark:border-gray-700'
            } ${currentPlan === plan.id ? 'ring-2 ring-blue-500' : ''}`}
          >
            {/* 热门标签 */}
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                最受欢迎
              </div>
            )}

            {/* 当前计划标签 */}
            {currentPlan === plan.id && (
              <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                当前计划
              </div>
            )}

            {/* 图标和名称 */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  plan.id === 'free'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    : plan.id === 'pro'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                }`}
              >
                {getIcon(plan.id)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{plan.nameEn}</p>
              </div>
            </div>

            {/* 价格 */}
            <div className="mb-6">
              <span className="text-4xl font-black text-gray-900 dark:text-white">
                {formatPrice(plan)}
              </span>
              {plan.priceCny > 0 && (
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  /{billingPeriod === 'yearly' ? '年' : '月'}
                </span>
              )}
            </div>

            {/* Tokens */}
            {plan.tokens > 0 && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  每月 {formatTokens(plan.tokens)} tokens
                </span>
              </div>
            )}

            {/* 功能列表 */}
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            {/* 按钮 */}
            <button
              onClick={() => onSelectPlan(plan.id)}
              disabled={currentPlan === plan.id}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                currentPlan === plan.id
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : plan.id === 'free'
                    ? 'border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:border-black dark:hover:border-white'
                    : plan.popular
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100'
              }`}
            >
              {currentPlan === plan.id
                ? '当前计划'
                : plan.id === 'free'
                  ? '免费使用'
                  : '立即订阅'}
            </button>
          </div>
        ))}
      </div>

      {/* 底部说明 */}
      <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>所有计划都包含完整的 AI 写作功能</p>
        <p className="mt-2">可随时取消订阅，无任何隐藏费用</p>
      </div>
    </div>
  );
}

export default PricingPage;
