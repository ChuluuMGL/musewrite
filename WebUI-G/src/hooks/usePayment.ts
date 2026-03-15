/**
 * MuseWrite 支付 Hook
 *
 * 处理支付流程
 */

import {useState, useCallback} from 'react';

interface PaymentState {
  loading: boolean;
  error: string | null;
  checkoutUrl: string | null;
  qrCodeUrl: string | null;
  orderId: string | null;
}

interface Plan {
  id: string;
  name: string;
  priceCny: number;
  priceUsd: number;
}

export function usePayment() {
  const [state, setState] = useState<PaymentState>({
    loading: false,
    error: null,
    checkoutUrl: null,
    qrCodeUrl: null,
    orderId: null
  });

  /**
   * 创建支付订单
   */
  const createPayment = useCallback(async (planId: string, region: 'cn' | 'global') => {
    setState((prev) => ({...prev, loading: true, error: null}));

    try {
      const response = await fetch('/api/v1/payment/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({planId, region})
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '创建支付失败');
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        checkoutUrl: data.checkoutUrl,
        qrCodeUrl: data.codeUrl || data.qrCodeUrl,
        orderId: data.orderId
      }));

      return data;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: (error as Error).message
      }));
      throw error;
    }
  }, []);

  /**
   * 查询订单状态
   */
  const checkPaymentStatus = useCallback(async (orderId: string, method: string = 'stripe') => {
    try {
      const response = await fetch(`/api/v1/payment/status/${orderId}?method=${method}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('查询订单状态失败:', error);
      return {success: false, error: (error as Error).message};
    }
  }, []);

  /**
   * 轮询支付状态
   */
  const pollPaymentStatus = useCallback(
    (orderId: string, method: string = 'stripe', interval: number = 3000, maxAttempts: number = 100) => {
      return new Promise((resolve, reject) => {
        let attempts = 0;

        const poll = async () => {
          attempts++;

          if (attempts > maxAttempts) {
            reject(new Error('支付超时'));
            return;
          }

          const status = await checkPaymentStatus(orderId, method);

          if (status.success && status.tradeStatus === 'SUCCESS') {
            resolve(status);
          } else if (status.success && status.status === 'active') {
            resolve(status);
          } else {
            setTimeout(poll, interval);
          }
        };

        poll();
      });
    },
    [checkPaymentStatus]
  );

  /**
   * 取消订阅
   */
  const cancelSubscription = useCallback(async (subscriptionId: string) => {
    setState((prev) => ({...prev, loading: true, error: null}));

    try {
      const response = await fetch('/api/v1/payment/cancel', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({subscriptionId})
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '取消订阅失败');
      }

      setState((prev) => ({...prev, loading: false}));
      return data;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: (error as Error).message
      }));
      throw error;
    }
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      checkoutUrl: null,
      qrCodeUrl: null,
      orderId: null
    });
  }, []);

  return {
    ...state,
    createPayment,
    checkPaymentStatus,
    pollPaymentStatus,
    cancelSubscription,
    reset
  };
}
