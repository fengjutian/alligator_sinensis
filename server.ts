import { fileRouter } from "./framework/router";
import { commonMiddleware } from "./app/server/db";

const handler = await fileRouter({ dir: "./app/routes" });

Bun.serve({
  port: 3000,
  fetch: handler,
  websocket: {
    open: (socket) => {},
  },
});

console.log("⚡ Bun 全栈模板：http://localhost:3000");
