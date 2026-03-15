/**
 * MuseWrite 认证 API 路由
 *
 * POST /api/v1/auth/register     - 注册
 * POST /api/v1/auth/login        - 登录
 * POST /api/v1/auth/logout       - 登出
 * POST /api/v1/auth/refresh      - 刷新 Token
 * POST /api/v1/auth/verify-otp   - 验证验证码
 * GET  /api/v1/auth/me           - 获取当前用户
 * GET  /api/v1/auth/oauth/:provider - OAuth 登录
 * GET  /api/v1/auth/region       - 获取地区信息
 */

const express = require('express');
const router = express.Router();
const authService = require('../supabase/auth');
const {getRegionInfo: _getRegionInfo, regionMiddleware} = require('../supabase/region');

// 应用地区中间件
router.use(regionMiddleware);

/**
 * 获取地区信息
 */
router.get('/region', (req, res) => {
  res.json({
    success: true,
    data: req.region
  });
});

/**
 * 注册
 */
router.post('/register', async (req, res) => {
  try {
    const {type, email, phone, password, name} = req.body;

    if (!authService.isAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'auth_service_not_configured',
        message: '认证服务未配置，请联系管理员'
      });
    }

    let user;
    const metadata = {name};

    if (type === 'phone' || phone) {
      // 手机号注册
      if (!phone || !password) {
        return res.status(400).json({
          success: false,
          error: 'missing_fields',
          message: '手机号和密码不能为空'
        });
      }
      user = await authService.signUpWithPhone(phone, password, metadata);
    } else {
      // 邮箱注册
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'missing_fields',
          message: '邮箱和密码不能为空'
        });
      }
      user = await authService.signUpWithEmail(email, password, metadata);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.user_metadata?.name
        }
      },
      message: '注册成功，请验证您的邮箱或手机号'
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(400).json({
      success: false,
      error: 'registration_failed',
      message: error.message
    });
  }
});

/**
 * 登录
 */
router.post('/login', async (req, res) => {
  try {
    const {email, phone, password} = req.body;

    if (!authService.isAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'auth_service_not_configured',
        message: '认证服务未配置'
      });
    }

    let data;

    if (phone) {
      // 手机号登录 - 发送验证码
      if (!password) {
        // 发送验证码
        await authService.sendOtp(phone);
        return res.json({
          success: true,
          message: '验证码已发送',
          requireOtp: true
        });
      }
    }

    if (email && password) {
      // 邮箱密码登录
      data = await authService.signInWithEmail(email, password);
    } else {
      return res.status(400).json({
        success: false,
        error: 'missing_credentials',
        message: '请提供邮箱和密码'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          phone: data.user.phone,
          name: data.user.user_metadata?.name
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        }
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(401).json({
      success: false,
      error: 'login_failed',
      message: error.message
    });
  }
});

/**
 * 验证验证码
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const {phone, token} = req.body;

    if (!authService.isAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'auth_service_not_configured'
      });
    }

    const data = await authService.verifyOtp(phone, token);

    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          phone: data.user.phone
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        }
      }
    });
  } catch (error) {
    console.error('验证码验证失败:', error);
    res.status(400).json({
      success: false,
      error: 'otp_verification_failed',
      message: error.message
    });
  }
});

/**
 * 刷新 Token
 */
router.post('/refresh', async (req, res) => {
  try {
    const {refresh_token} = req.body;

    if (!authService.isAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'auth_service_not_configured'
      });
    }

    const data = await authService.refreshToken(refresh_token);

    res.json({
      success: true,
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        }
      }
    });
  } catch (error) {
    console.error('Token 刷新失败:', error);
    res.status(401).json({
      success: false,
      error: 'token_refresh_failed',
      message: error.message
    });
  }
});

/**
 * 登出
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token && authService.isAvailable()) {
      await authService.signOut(token);
    }

    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出失败:', error);
    res.json({
      success: true,
      message: '登出成功'
    });
  }
});

/**
 * 获取当前用户信息
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: '请先登录'
      });
    }

    if (!authService.isAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'auth_service_not_configured'
      });
    }

    const user = await authService.verifyToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'invalid_token',
        message: 'Token 无效或已过期'
      });
    }

    // 获取订阅信息
    const subscription = await authService.getUserSubscription(user.id);

    res.json({
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
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: error.message
    });
  }
});

/**
 * OAuth 登录
 */
router.get('/oauth/:provider', async (req, res) => {
  try {
    const {provider} = req.params;
    const redirectUrl = req.query.redirect || `${req.protocol}://${req.get('host')}/auth/callback`;

    if (!authService.isAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'auth_service_not_configured'
      });
    }

    const url = await authService.getOAuthUrl(provider, redirectUrl);

    res.redirect(url);
  } catch (error) {
    console.error('OAuth 登录失败:', error);
    res.status(400).json({
      success: false,
      error: 'oauth_failed',
      message: error.message
    });
  }
});

/**
 * OAuth 回调
 */
router.get('/callback', (req, res) => {
  const {access_token, refresh_token, error} = req.query;

  if (error) {
    return res.redirect(`/login?error=${encodeURIComponent(error)}`);
  }

  // 重定向到前端，带上 token
  res.redirect(`/?access_token=${access_token}&refresh_token=${refresh_token}`);
});

module.exports = router;
