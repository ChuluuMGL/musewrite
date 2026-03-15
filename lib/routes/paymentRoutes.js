/**
 * MuseWrite 支付 API 路由
 *
 * GET  /api/v1/payment/plans        - 获取可用计划
 * POST /api/v1/payment/create       - 创建支付订单
 * POST /api/v1/payment/callback/:method - 支付回调
 * GET  /api/v1/payment/status/:orderId - 查询订单状态
 * POST /api/v1/payment/cancel       - 取消订阅
 * GET  /api/v1/payment/config       - 检查支付配置
 */

const payment = require('../payment/index');

module.exports = function (_rootPath) {
  return {
    // 获取可用计划
    'GET /api/v1/payment/plans': (req, res) => {
      const plans = payment.getPlans();
      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          plans: Object.entries(plans).map(([id, plan]) => ({
            id,
            ...plan
          }))
        })
      );
    },

    // 检查支付配置
    'GET /api/v1/payment/config': (req, res) => {
      const config = payment.checkPaymentConfig();
      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          config
        })
      );
    },

    // 创建支付订单
    'POST /api/v1/payment/create': async (req, res, _params, body) => {
      try {
        const {planId, method, region} = body;

        // 从认证信息获取用户ID
        const userId = req.user?.id || 'anonymous';
        const userRegion = region || 'global';

        if (!planId) {
          res.writeHead(400);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'missing_plan_id'
            })
          );
        }

        const result = await payment.createPayment(planId, userId, userRegion, method);

        res.writeHead(200);
        res.end(JSON.stringify({success: true, ...result}));
      } catch (error) {
        console.error('创建支付订单失败:', error);
        res.writeHead(400);
        res.end(
          JSON.stringify({
            success: false,
            error: error.message
          })
        );
      }
    },

    // 支付宝回调
    'POST /api/v1/payment/callback/alipay': async (req, res) => {
      try {
        const body = await readBody(req);
        const params = parseFormUrlEncoded(body);

        const result = payment.verifyCallback('alipay', params);

        if (result.success) {
          // 更新订阅状态
          await updateSubscription(result.userId, result.planId, {
            orderId: result.orderId,
            transactionId: result.tradeNo,
            method: 'alipay',
            amount: result.amount
          });

          res.writeHead(200);
          res.end('success');
        } else {
          res.writeHead(400);
          res.end('fail');
        }
      } catch (error) {
        console.error('支付宝回调处理失败:', error);
        res.writeHead(500);
        res.end('fail');
      }
    },

    // 微信支付回调
    'POST /api/v1/payment/callback/wechat': async (req, res) => {
      try {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        await new Promise((resolve) => req.on('end', resolve));

        const result = payment.verifyCallback('wechat', body);

        if (result.success) {
          // 更新订阅状态
          await updateSubscription(result.userId, result.planId, {
            orderId: result.orderId,
            transactionId: result.transactionId,
            method: 'wechat',
            amount: result.amount
          });

          res.writeHead(200);
          res.end(
            '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
          );
        } else {
          res.writeHead(200);
          res.end(
            '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[FAIL]]></return_msg></xml>'
          );
        }
      } catch (error) {
        console.error('微信支付回调处理失败:', error);
        res.writeHead(500);
        res.end(
          '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[ERROR]]></return_msg></xml>'
        );
      }
    },

    // Stripe Webhook
    'POST /api/v1/payment/callback/stripe': async (req, res) => {
      try {
        const signature = req.headers['stripe-signature'];
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        await new Promise((resolve) => req.on('end', resolve));

        const event = payment.verifyWebhook('stripe', {
          payload: body,
          signature
        });

        if (!event.success) {
          res.writeHead(400);
          return res.end(JSON.stringify({error: 'Invalid signature'}));
        }

        const result = payment.handleWebhookEvent(event);

        // 处理不同事件
        if (result.action === 'subscription_created' || result.action === 'payment_succeeded') {
          await updateSubscription(result.userId, result.planId, {
            subscriptionId: result.subscriptionId,
            customerId: result.customerId,
            method: 'stripe'
          });
        }

        res.writeHead(200);
        res.end(JSON.stringify({received: true}));
      } catch (error) {
        console.error('Stripe webhook 处理失败:', error);
        res.writeHead(500);
        res.end(JSON.stringify({error: error.message}));
      }
    },

    // 查询订单状态
    'GET /api/v1/payment/status/:orderId': async (req, res, params) => {
      try {
        const {orderId} = params;
        const {method = 'stripe'} = req.query || {};

        const result = await payment.queryOrder(method, orderId);

        res.writeHead(200);
        res.end(JSON.stringify({success: true, ...result}));
      } catch (error) {
        console.error('查询订单失败:', error);
        res.writeHead(400);
        res.end(
          JSON.stringify({
            success: false,
            error: error.message
          })
        );
      }
    },

    // 取消订阅
    'POST /api/v1/payment/cancel': async (req, res, _params, body) => {
      try {
        const {subscriptionId, method = 'stripe'} = body;

        if (!subscriptionId) {
          res.writeHead(400);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'missing_subscription_id'
            })
          );
        }

        const result = await payment.cancelSubscription(method, subscriptionId);

        res.writeHead(200);
        res.end(JSON.stringify({success: true, ...result}));
      } catch (error) {
        console.error('取消订阅失败:', error);
        res.writeHead(400);
        res.end(
          JSON.stringify({
            success: false,
            error: error.message
          })
        );
      }
    }
  };
};

// 辅助函数
async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function parseFormUrlEncoded(body) {
  const params = {};
  body.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });
  return params;
}

async function updateSubscription(userId, planId, paymentInfo) {
  // 实际项目中应该更新数据库中的订阅状态
  console.log('更新订阅:', {userId, planId, ...paymentInfo});
  // TODO: 调用 Supabase 更新订阅表
}
