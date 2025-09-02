/**
 * 中间件栈定义
 * 提供CORS、安全头、会话处理等功能
 */

// 中间件上下文类型
export interface MiddlewareContext {
  req: Request;
  url: URL;
  locals: Record<string, any>;
  [key: string]: any;
}

// 中间件函数类型
export type Middleware = (
  next: (ctx: MiddlewareContext) => Promise<Response> | Response
) => (
  ctx: MiddlewareContext
) => Promise<Response> | Response;

/**
 * CORS中间件
 * 处理跨域请求
 */
export const corsMiddleware: Middleware = (next) => async (ctx) => {
  // 允许所有来源
  ctx.headers = ctx.headers || {};
  ctx.headers['Access-Control-Allow-Origin'] = '*';
  ctx.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
  ctx.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
  
  // 处理预检请求
  if (ctx.req.method === 'OPTIONS') {
    return new Response(null, { headers: ctx.headers, status: 204 });
  }
  
  // 继续处理链
  const response = await next(ctx);
  
  // 应用CORS头到响应
  Object.entries(ctx.headers).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });
  
  return response;
};

/**
 * 安全头中间件
 * 设置安全相关的HTTP头
 */
export const securityHeadersMiddleware: Middleware = (next) => async (ctx) => {
  const response = await next(ctx);
  
  // 添加安全头
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', 'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:');
  
  return response;
};

/**
 * 解析Cookie中间件
 */
export const cookieParserMiddleware: Middleware = (next) => async (ctx) => {
  const cookieHeader = ctx.req.headers.get('Cookie');
  if (cookieHeader) {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    ctx.cookies = cookies;
  }
  
  return next(ctx);
};

/**
 * 组合多个中间件
 * @param middlewares 中间件数组
 * @param handler 最终处理函数
 * @returns 组合后的处理函数
 */
export function applyMiddleware(
  middlewares: Middleware[],
  handler: (ctx: MiddlewareContext) => Promise<Response> | Response
) {
  return middlewares.reduceRight((prev, curr) => curr(prev), handler);
}

/**
 * 默认中间件栈
 */
export const defaultMiddlewareStack: Middleware[] = [
  corsMiddleware,
  securityHeadersMiddleware,
  cookieParserMiddleware
];

/**
 * 导出一个可以在路由中使用的中间件包装函数
 */
export function withMiddleware(
  handler: (ctx: MiddlewareContext) => Promise<Response> | Response,
  middlewares: Middleware[] = defaultMiddlewareStack
) {
  return async (ctx: any) => {
    // 标准化上下文
    const standardCtx: MiddlewareContext = {
      req: ctx.req,
      url: ctx.url || new URL(ctx.req.url),
      locals: ctx.locals || {},
      ...ctx
    };
    
    // 应用中间件
    const wrappedHandler = applyMiddleware(middlewares, handler);
    return await wrappedHandler(standardCtx);
  };
}