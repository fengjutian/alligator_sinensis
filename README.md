# alligator_sinensis
扬子鳄 全栈开发框架


# 1) 设计目标与原则

* **单一运行时**：前后端同用 TypeScript，服务端基于 `Bun.serve`，工具链尽量走 Bun 内置（build、test、x、sqlite）。
* **渐进式增强**：先做最小核心（路由 + SSR + API），再加 RPC、WS、Job、Auth、DB、插件。
* **类型端到端**：用 Zod/Valibot 校验输入，用 TS infer 生成客户端类型。
* **可插拔**：中间件、路由、页面、命令行与插件系统都模块化。
* **部署友好**：一个命令启动；Docker 多阶段构建；边缘/传统环境都可跑。

---

# 2) 目录结构（建议）

```
app/
  routes/
    +page.tsx          # 根页面
    about+page.tsx
    api/
      users+get.ts     # GET /api/users
      users+post.ts    # POST /api/users
    ws/
      chat+ws.ts       # WS /ws/chat
  components/
  layouts/
  server/
    entry-server.tsx   # SSR 入口
    middleware.ts      # 中间件栈（CORS、会话等）
    rpc.ts             # RPC 注册
    db.ts              # DB 适配层 (Drizzle/Prisma/ bun:sqlite)
  client/
    entry-client.tsx   # 客户端入口 & 水合
  assets/
framework/
  router.ts            # 文件路由器（约定式）
  ssr.ts               # SSR 渲染器（流式）
  runtime.ts           # 框架运行时（Context、Response 包装）
  cli.ts               # 命令行：dev/build/start
  plugins.ts           # 插件系统
bunfig.toml
package.json
```

---

# 3) 最小可运行核心

## 3.1 HTTP Server（Bun.serve + 中间件）

```ts
// framework/runtime.ts
export type Ctx = {
  req: Request;
  url: URL;
  params: Record<string, string>;
  locals: Record<string, unknown>;
};

type Handler = (ctx: Ctx) => Response | Promise<Response>;

export const withMiddlewares =
  (handlers: Handler[]): Handler =>
  async (ctx) => {
    let i = 0;
    const next = async (): Promise<Response> =>
      handlers[++i] ? handlers[i](ctx) : new Response("Not Found", { status: 404 });
    return handlers[i](ctx) ?? next();
  };
```

```ts
// server.ts
import { fileRouter } from "./framework/router";
import { commonMiddleware } from "./app/server/middleware";

const handler = await fileRouter({ dir: "app/routes", middleware: commonMiddleware });

Bun.serve({
  port: 3000,
  fetch: handler,
});
console.log("⚡ Bun app on http://localhost:3000");
```

## 3.2 约定式路由（文件系统）

* `xxx+page.tsx` → SSR 页面
* `api/xxx+get.ts|post.ts` → REST 处理器
* `ws/xxx+ws.ts` → WebSocket 处理器

```ts
// framework/router.ts（简化示例）
export async function fileRouter({ dir, middleware }) {
  // 扫描目录，建立路由表（/about、/api/users、/ws/chat）
  // 动态 import 对应模块，匹配方法与路径
  const routes = await buildRouteTable(dir);
  return async (req: Request) => {
    const url = new URL(req.url);
    const match = matchRoute(routes, req.method, url.pathname);
    if (!match) return new Response("Not found", { status: 404 });
    const ctx = { req, url, params: match.params, locals: {} };
    return middleware ? middleware(match.handler)(ctx) : match.handler(ctx);
  };
}
```

## 3.3 SSR（流式渲染）

* 服务器端渲染 React，客户端水合。
* 首屏快；可选切片/流式（`renderToReadableStream`）。

```ts
// framework/ssr.ts
import { renderToReadableStream } from "react-dom/server";

export async function renderPage(jsx: JSX.Element, { head = "" } = {}) {
  const stream = await renderToReadableStream(
    <html>
      <head dangerouslySetInnerHTML={{ __html: head }} />
      <body><div id="root">{jsx}</div><script src="/client.js" defer></script></body>
    </html>
  );
  return new Response(stream, { headers: { "Content-Type": "text/html" } });
}
```

```tsx
// app/routes/+page.tsx
import { renderPage } from "../../framework/ssr";

export default async function Page() {
  return <main><h1>Hello Bun SSR</h1></main>;
}

export const GET = async () => renderPage(<Page />);
```

## 3.4 静态资源与构建

* 开发：直接服务 `/client/entry-client.tsx` 由 Bun 内建打包（`bun build --watch`）。
* 生产：`bun build client/entry-client.tsx --outdir=dist/public`，服务器静态目录挂载到 `/`.

---

# 4) 类型安全 RPC（可选但强烈推荐）

* 用 Zod 声明输入/输出，自动导出客户端调用器。
* 避免手写 fetch 与类型重复。

```ts
// app/server/rpc.ts
import { z } from "zod";
export const rpc = {
  getUser: {
    input: z.object({ id: z.string() }),
    resolve: async ({ id }) => ({ id, name: "Ada" })
  }
} as const;
```

```ts
// framework/rpc-client-gen.ts（开发时生成）
type ExtractApi<T> = { [K in keyof T]: T[K] extends { input: infer I; resolve: (...a:any)=>infer O }
  ? (input: I) => Promise<O> : never };

export type RpcClient = ExtractApi<typeof import("../app/server/rpc").rpc>;
```

```ts
// app/routes/api/rpc+post.ts
import { rpc } from "../../server/rpc";
export const POST = async (ctx) => {
  const body = await ctx.req.json();
  const { method, params } = body;
  const def = (rpc as any)[method];
  const parsed = def.input.parse(params);
  const data = await def.resolve(parsed);
  return Response.json({ data });
};
```

客户端直接：

```ts
// client/rpc.ts
export async function call<T>(method: string, params: unknown): Promise<T> {
  const res = await fetch("/api/rpc", { method: "POST", body: JSON.stringify({ method, params }) });
  return (await res.json()).data as T;
}
```

---

# 5) WebSocket（聊天室/实时同步）

```ts
// app/routes/ws/chat+ws.ts
export const WS = {
  open(ws) { ws.send("welcome"); },
  message(ws, msg) { ws.publish("room", msg); },
  close(ws) {}
};

// router 内部：若路径匹配 `+ws.ts`，转交给 Bun.serve 的 websocket 钩子
Bun.serve({
  websocket: {
    open: (ws) => WS.open?.(ws),
    message: (ws, message) => WS.message?.(ws, message),
    close: (ws) => WS.close?.(ws),
  },
  // ...
});
```

---

# 6) 数据层与会话

* 选项 A：`bun:sqlite` 内置；适合轻量项目。
* 选项 B：Drizzle ORM + Postgres/MySQL/SQLite。
* 会话：签名 Cookie（`httpOnly`, `sameSite=lax`），或 JWT + 短期存储。

```ts
// app/server/db.ts (示例：bun:sqlite 直连)
import { Database } from "bun:sqlite";
export const db = new Database("app.db");
db.run("create table if not exists users (id text primary key, name text)");
```

```ts
// app/server/middleware.ts
export const commonMiddleware = (next) => async (ctx) => {
  // CORS / 安全头 / 解析 cookie / 注入 db
  ctx.locals.db = (await import("./db")).db;
  return next(ctx);
};
```

---

# 7) 前端体验

* **路由与数据**：简单约定 `export const load = async (ctx) => data`；服务器渲染时调用并把 `data` 注入到页面 props；客户端水合后通过同名函数做导航预取。
* **渐进式增强**：表单自动转为 fetch + 局部刷新；支持“服务器动作”（直接在组件中调用 `action()`，编译时分离到服务端）。
* **HMR**：开发可用 Vite 作为 dev server（只负责前端），生产用 `bun build`；或等待 Bun 的 HMR 稳定后替换。

---

# 8) 插件系统（扩展点）

* `plugins.ts` 暴露钩子：`onRoute`, `onRequest`, `onRendered`, `onBuild`, `defineRpc`。
* 常用插件：Auth（OAuth/Email OTP）、i18n、MDX、图片优化、Tailwind、OpenAPI 生成、Sentry 日志。

```ts
export type Plugin = {
  name: string;
  onRequest?: (ctx: Ctx) => Promise<void>|void;
  onBuild?: (args:{client:boolean})=>Promise<void>|void;
};
export function createApp(plugins: Plugin[] = []) { /* 注册并在路由/构建阶段执行 */ }
```

---

# 9) CLI 与开发体验

* `bun x tsx framework/cli.ts dev`：启动 SSR + 前端构建 watch。
* 命令：`dev`、`build`、`start`、`db:push`、`gen:rpc`、`routes`（打印路由）。
* 错误边界、请求日志、性能计时（Server-Timing header）。

---

# 10) 测试与质量

* `bun test`：单元测试（路由匹配、RPC 校验、DB 操作）。
* 端到端：Playwright 指向 `http://localhost:3000`。
* 类型守卫：严格 TS 配置，RPC 输入输出都有 Zod 校验。

---

# 11) 部署

* 单进程：`bun run start` 即可。
* Docker：

```Dockerfile
FROM oven/bun:alpine AS build
WORKDIR /app
COPY . .
RUN bun install && bun run build

FROM oven/bun:alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server.js ./server.js
EXPOSE 3000
CMD ["bun","server.js"]
```

* 也可上 Fly/Render/自托管；或在边缘（若平台支持 Bun）跑。

---

# 12) 渐进路线图

1. v0：文件路由 + SSR + 静态资源 + REST
2. v0.1：类型安全 RPC + Zod + 代码生成
3. v0.2：WS/事件推送（频道发布/订阅）
4. v0.3：Auth（会话、OAuth）、权限（RBAC）
5. v0.4：任务队列（基于 Bun scheduler/cron + SQLite 队列表）
6. v0.5：插件市场（MDX、i18n、日志、S3 存储）
7. v1.0：文档站、示例模板（博客、仪表盘、SaaS）

---


bun install
bun run server.ts


docker-compose build
docker-compose up -d

