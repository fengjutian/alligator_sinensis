import { fileRouter } from "./framework/router";
import { commonMiddleware } from "./app/server/db";
import path from "path";

const handler = await fileRouter({ dir: "./app/routes" });
const PUBLIC_DIR = path.join(import.meta.dir, "public");

Bun.serve({
  port: 9527,
  async fetch(req) {
    const url = new URL(req.url);
    
    // 首先尝试通过路由系统处理
    const routeResponse = await handler(req);
    if (routeResponse.status !== 404) {
      return routeResponse;
    }
    
    try {
      const safePath = path.normalize(url.pathname);
      if (safePath.includes('..')) {
        return new Response("Forbidden", { status: 403 });
      }
      
      const filePath = path.join(PUBLIC_DIR, safePath);
      return new Response(Bun.file(filePath));
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  },
  websocket: {
    open: (socket) => {},
    message: (socket, message) => {},
    close: (socket, code, reason) => {},
  }
});

console.log("⚡ Bun 扬子鳄全栈模板：http://localhost:9527");
