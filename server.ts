import { fileRouter } from "./framework/router";
import { commonMiddleware } from "./app/server/db";

const handler = await fileRouter({ dir: "./app/routes" });

Bun.serve({
  port: 3000,
  fetch: handler,
  websocket: {
    open: (socket) => {},
    message: (socket, message) => {
      // You can handle messages here, or leave empty
    },
    close: (socket, code, reason) => {},
  },
});

console.log("⚡ Bun 扬子鳄全栈模板：http://localhost:3000");
