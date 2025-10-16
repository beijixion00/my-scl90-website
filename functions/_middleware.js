// Cloudflare Pages 中间件文件
// 用于处理认证和路由

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 管理员页面认证检查
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const cookies = request.headers.get('cookie') || '';
    const isAuthenticated = cookies.includes('admin_token=secure_admin_token_2024');

    if (!isAuthenticated) {
      return Response.redirect(new URL('/admin/login', request.url));
    }
  }

  // 继续处理请求
  return await next();
}