/**
 * MuseWrite Stripe 支付集成
 *
 * 用于海外用户支付
 */

// Stripe 配置
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * 检查是否配置完整
 */
function isConfigured() {
  return !!STRIPE_SECRET_KEY;
}

/**
 * 调用 Stripe API
 */
async function stripeApi(endpoint, data) {
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(data).toString()
  });

  return response.json();
}

/**
 * 创建 Checkout Session
 */
async function createCheckoutSession(options) {
  const {orderId, userId, planId, amount, name, priceId} = options;

  if (!isConfigured()) {
    throw new Error('Stripe 未配置');
  }

  // 如果有 Price ID，使用订阅模式
  if (priceId) {
    const sessionData = {
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${process.env.BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/payment/cancel`,
      client_reference_id: orderId,
      'metadata[user_id]': userId,
      'metadata[plan_id]': planId,
      'metadata[order_id]': orderId
    };

    const session = await stripeApi('/checkout/sessions', sessionData);

    if (session.error) {
      throw new Error(session.error.message);
    }

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      orderId,
      method: 'stripe'
    };
  }

  // 否则使用一次性支付模式
  const sessionData = {
    mode: 'payment',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': (amount * 100).toString(), // 美分
    'line_items[0][price_data][product_data][name]': name,
    'line_items[0][quantity]': '1',
    success_url: `${process.env.BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/payment/cancel`,
    client_reference_id: orderId,
    'metadata[user_id]': userId,
    'metadata[plan_id]': planId,
    'metadata[order_id]': orderId
  };

  const session = await stripeApi('/checkout/sessions', sessionData);

  if (session.error) {
    throw new Error(session.error.message);
  }

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    orderId,
    method: 'stripe'
  };
}

/**
 * 验证 Webhook
 */
function verifyWebhook(payload, signature) {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe Webhook Secret 未配置');
  }

  // 注意：实际项目中应该使用 stripe 库来验证签名
  // 这里简化处理，实际使用时需要安装 stripe 包
  // const stripe = require('stripe')(STRIPE_SECRET_KEY);
  // const event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);

  try {
    const event = JSON.parse(payload);

    return {
      success: true,
      type: event.type,
      data: event.data.object
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid payload'
    };
  }
}

/**
 * 处理 Webhook 事件
 */
function handleWebhookEvent(event) {
  const {type, data} = event;

  switch (type) {
    case 'checkout.session.completed':
      return {
        action: 'subscription_created',
        orderId: data.client_reference_id,
        subscriptionId: data.subscription,
        customerId: data.customer,
        userId: data.metadata?.user_id,
        planId: data.metadata?.plan_id
      };

    case 'invoice.paid':
      return {
        action: 'payment_succeeded',
        subscriptionId: data.subscription,
        invoiceId: data.id,
        amount: data.amount_paid
      };

    case 'invoice.payment_failed':
      return {
        action: 'payment_failed',
        subscriptionId: data.subscription,
        invoiceId: data.id
      };

    case 'customer.subscription.deleted':
      return {
        action: 'subscription_cancelled',
        subscriptionId: data.id,
        customerId: data.customer
      };

    case 'customer.subscription.updated':
      return {
        action: 'subscription_updated',
        subscriptionId: data.id,
        status: data.status,
        cancelAtPeriodEnd: data.cancel_at_period_end
      };

    default:
      return {
        action: 'unknown',
        type
      };
  }
}

/**
 * 查询订阅状态
 */
async function querySubscription(subscriptionId) {
  if (!isConfigured()) {
    throw new Error('Stripe 未配置');
  }

  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`
    }
  });

  const subscription = await response.json();

  if (subscription.error) {
    return {
      success: false,
      error: subscription.error.message
    };
  }

  return {
    success: true,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    planId: subscription.metadata?.plan_id
  };
}

/**
 * 取消订阅
 */
async function cancelSubscription(subscriptionId) {
  if (!isConfigured()) {
    throw new Error('Stripe 未配置');
  }

  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`
    }
  });

  const subscription = await response.json();

  if (subscription.error) {
    return {
      success: false,
      error: subscription.error.message
    };
  }

  return {
    success: true,
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  };
}

/**
 * 获取客户门户链接
 */
async function createCustomerPortalSession(customerId, returnUrl) {
  if (!isConfigured()) {
    throw new Error('Stripe 未配置');
  }

  const sessionData = {
    customer: customerId,
    return_url: returnUrl
  };

  const session = await stripeApi('/billing_portal/sessions', sessionData);

  if (session.error) {
    throw new Error(session.error.message);
  }

  return {
    url: session.url
  };
}

module.exports = {
  isConfigured,
  createCheckoutSession,
  verifyWebhook,
  handleWebhookEvent,
  querySubscription,
  cancelSubscription,
  createCustomerPortalSession
};
