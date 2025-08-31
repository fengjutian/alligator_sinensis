import { fileRouter } from "./framework/router";
import { commonMiddleware } from "./app/server/db";

const handler = await fileRouter({ dir: "./app/routes" });

Bun.serve({
  port: 9527,
  fetch: handler,
  websocket: {
    open: (socket) => {},
    message: (socket, message) => {
      // You can handle messages here, or leave empty
    },
    close: (socket, code, reason) => {},
  },
  static: {
    directory: new URL("./public", import.meta.url).pathname, // 指定静态文件目录
    publicPath: "/public",  // URL路径前缀
  },
});

console.log("⚡ Bun 扬子鳄全栈模板：http://localhost:9527");
