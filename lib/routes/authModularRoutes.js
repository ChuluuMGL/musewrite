/**
 * MuseWrite 认证路由（模块化格式）
 *
 * 兼容现有路由系统
 */

const authService = require('../supabase/auth');
const {getRegionInfo} = require('../supabase/region');

module.exports = function (_rootPath) {
  return {
    // 获取地区信息
    'GET /api/v1/auth/region': async (req, res) => {
      try {
        const info = await getRegionInfo(req);
        res.writeHead(200);
        res.end(JSON.stringify({success: true, data: info}));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({success: false, error: error.message}));
      }
    },

    // 注册
    'POST /api/v1/auth/register': async (req, res, _params, body) => {
      try {
        const {type, email, phone, password, name} = body;

        if (!authService.isAvailable()) {
          res.writeHead(503);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'auth_service_not_configured',
              message: '认证服务未配置，请联系管理员'
            })
          );
        }

        let data;
        const metadata = {name};

        if (type === 'phone' || phone) {
          if (!phone || !password) {
            res.writeHead(400);
            return res.end(
              JSON.stringify({
                success: false,
                error: 'missing_fields',
                message: '手机号和密码不能为空'
              })
            );
          }
          data = await authService.signUpWithPhone(phone, password, metadata);
        } else {
          if (!email || !password) {
            res.writeHead(400);
            return res.end(
              JSON.stringify({
                success: false,
                error: 'missing_fields',
                message: '邮箱和密码不能为空'
              })
            );
          }
          data = await authService.signUpWithEmail(email, password, metadata);
        }

        res.writeHead(200);
        res.end(JSON.stringify({success: true, data}));
      } catch (error) {
        console.error('注册失败:', error);
        res.writeHead(400);
        res.end(
          JSON.stringify({
            success: false,
            error: 'registration_failed',
            message: error.message
          })
        );
      }
    },

    // 登录
    'POST /api/v1/auth/login': async (req, res, _params, body) => {
      try {
        const {email, password} = body;

        if (!authService.isAvailable()) {
          res.writeHead(503);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'auth_service_not_configured'
            })
          );
        }

        if (!email || !password) {
          res.writeHead(400);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'missing_fields',
              message: '邮箱和密码不能为空'
            })
          );
        }

        const data = await authService.signInWithEmail(email, password);
        res.writeHead(200);
        res.end(JSON.stringify({success: true, data}));
      } catch (error) {
        console.error('登录失败:', error);
        res.writeHead(401);
        res.end(
          JSON.stringify({
            success: false,
            error: 'login_failed',
            message: error.message
          })
        );
      }
    },

    // 发送验证码
    'POST /api/v1/auth/send-otp': async (req, res, _params, body) => {
      try {
        const {phone} = body;

        if (!authService.isAvailable()) {
          res.writeHead(503);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'auth_service_not_configured'
            })
          );
        }

        if (!phone) {
          res.writeHead(400);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'missing_phone',
              message: '手机号不能为空'
            })
          );
        }

        await authService.sendOtp(phone);
        res.writeHead(200);
        res.end(JSON.stringify({success: true, message: '验证码已发送'}));
      } catch (error) {
        console.error('发送验证码失败:', error);
        res.writeHead(400);
        res.end(
          JSON.stringify({
            success: false,
            error: 'send_otp_failed',
            message: error.message
          })
        );
      }
    },

    // 验证验证码
    'POST /api/v1/auth/verify-otp': async (req, res, _params, body) => {
      try {
        const {phone, token} = body;

        if (!authService.isAvailable()) {
          res.writeHead(503);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'auth_service_not_configured'
            })
          );
        }

        if (!phone || !token) {
          res.writeHead(400);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'missing_fields',
              message: '手机号和验证码不能为空'
            })
          );
        }

        const data = await authService.verifyOtp(phone, token);
        res.writeHead(200);
        res.end(JSON.stringify({success: true, data}));
      } catch (error) {
        console.error('验证验证码失败:', error);
        res.writeHead(401);
        res.end(
          JSON.stringify({
            success: false,
            error: 'verify_otp_failed',
            message: error.message
          })
        );
      }
    },

    // 获取当前用户
    'GET /api/v1/auth/me': async (req, res) => {
      try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');

        if (!token) {
          res.writeHead(401);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'no_token',
              message: '请先登录'
            })
          );
        }

        if (!authService.isAvailable()) {
          res.writeHead(503);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'auth_service_not_configured'
            })
          );
        }

        const user = await authService.verifyToken(token);

        if (!user) {
          res.writeHead(401);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'invalid_token',
              message: 'Token 无效或已过期'
            })
          );
        }

        const subscription = await authService.getUserSubscription(user.id);

        res.writeHead(200);
        res.end(
          JSON.stringify({
            success: true,
            data: {
              user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                name: user.user_metadata?.name,
                avatar: user.user_metadata?.avatar_url,
                region: user.user_metadata?.region,
                subscription
              }
            }
          })
        );
      } catch (error) {
        console.error('获取用户信息失败:', error);
        res.writeHead(401);
        res.end(
          JSON.stringify({
            success: false,
            error: 'unauthorized',
            message: error.message
          })
        );
      }
    },

    // 登出
    'POST /api/v1/auth/logout': async (req, res) => {
      try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');

        if (token && authService.isAvailable()) {
          await authService.signOut(token);
        }

        res.writeHead(200);
        res.end(JSON.stringify({success: true, message: '已登出'}));
      } catch (error) {
        console.error('登出失败:', error);
        res.writeHead(200);
        res.end(JSON.stringify({success: true, message: '已登出'}));
      }
    },

    // 刷新 Token
    'POST /api/v1/auth/refresh': async (req, res, _params, body) => {
      try {
        const {refresh_token: refreshToken} = body;

        if (!refreshToken) {
          res.writeHead(400);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'missing_refresh_token'
            })
          );
        }

        if (!authService.isAvailable()) {
          res.writeHead(503);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'auth_service_not_configured'
            })
          );
        }

        const data = await authService.refreshToken(refreshToken);
        res.writeHead(200);
        res.end(JSON.stringify({success: true, data}));
      } catch (error) {
        console.error('刷新 Token 失败:', error);
        res.writeHead(401);
        res.end(
          JSON.stringify({
            success: false,
            error: 'refresh_failed',
            message: error.message
          })
        );
      }
    },

    // 检查 Token 配额
    'POST /api/v1/auth/check-quota': async (req, res, _params, body) => {
      try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');
        const {tokens: requiredTokens} = body;

        if (!token) {
          res.writeHead(401);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'no_token'
            })
          );
        }

        if (!authService.isAvailable()) {
          // 未配置认证服务时，允许使用（用户自带 API Key）
          return res.end(
            JSON.stringify({
              success: true,
              data: {allowed: true, reason: 'no_auth_service'}
            })
          );
        }

        const user = await authService.verifyToken(token);
        if (!user) {
          res.writeHead(401);
          return res.end(
            JSON.stringify({
              success: false,
              error: 'invalid_token'
            })
          );
        }

        const quota = await authService.checkTokenQuota(user.id, requiredTokens || 1000);
        res.writeHead(200);
        res.end(JSON.stringify({success: true, data: quota}));
      } catch (error) {
        console.error('检查配额失败:', error);
        res.writeHead(500);
        res.end(
          JSON.stringify({
            success: false,
            error: 'quota_check_failed',
            message: error.message
          })
        );
      }
    },

    // 记录 Token 使用量
    'POST /api/v1/auth/record-usage': async (req, res, _params, body) => {
      try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');
        const {tokens} = body;

        if (!token || !authService.isAvailable()) {
          res.writeHead(200);
          return res.end(JSON.stringify({success: true}));
        }

        const user = await authService.verifyToken(token);
        if (user && tokens) {
          await authService.recordTokenUsage(user.id, tokens);
        }

        res.writeHead(200);
        res.end(JSON.stringify({success: true}));
      } catch (error) {
        console.error('记录使用量失败:', error);
        res.writeHead(200);
        res.end(JSON.stringify({success: true})); // 不阻塞主流程
      }
    }
  };
};
