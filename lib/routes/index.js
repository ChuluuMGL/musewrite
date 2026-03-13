/**
 * Routes Index - 路由模块入口
 *
 * 统一加载和管理所有API路由
 */

const path = require('path');

module.exports = function(rootPath) {
  // 加载所有路由模块
  const storageRoutes = require('./storageRoutes')(rootPath);
  const preferencesRoutes = require('./preferencesRoutes')(rootPath);
  const publishRoutes = require('./publishRoutes')(rootPath);
  const configRoutes = require('./configRoutes')(rootPath);
  const chatRoutes = require('./chatRoutes')(rootPath);
  const twinRoutes = require('./twinRoutes')(rootPath);

  // 合并所有路由
  const allRoutes = {
    ...storageRoutes,
    ...preferencesRoutes,
    ...publishRoutes,
    ...configRoutes,
    ...chatRoutes,
    ...twinRoutes
  };

  return {
    routes: allRoutes,

    /**
     * 匹配路由
     * @param {string} method - HTTP 方法
     * @param {string} pathname - 请求路径
     * @returns {object|null} - 匹配的路由处理器
     */
    match(method, pathname) {
      // 遍历所有路由
      for (const [routeKey, handler] of Object.entries(allRoutes)) {
        const [routeMethod, routePath] = routeKey.split(' ');

        // 检查方法是否匹配
        if (routeMethod !== method) continue;

        // 解析路由参数
        const match = this._matchPath(routePath, pathname);
        if (match) {
          return {
            handler,
            params: match.params
          };
        }
      }

      return null;
    },

    /**
     * 路径匹配
     */
    _matchPath(routePath, pathname) {
      const routeParts = routePath.split('/');
      const pathParts = pathname.split('/');

      if (routeParts.length !== pathParts.length) {
        return null;
      }

      const params = {};

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          // 参数
          params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          return null;
        }
      }

      return { params };
    },

    /**
     * 列出所有路由
     */
    listRoutes() {
      return Object.keys(allRoutes).sort();
    }
  };
};
