import fs from "fs";
import path from "path";

export async function fileRouter({ dir }: { dir: string }) {
  const routes: Array<{ pattern: RegExp; modulePath: string; type: string }> = [];

  function walk(d: string) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) walk(p);
      else if (stat.isFile()) {
        const rel = path.relative(dir, p).replace(/\\/g, "/");
        routes.push({
          pattern: new RegExp("^/" + rel.replace(/\+.*$/, "").replace(/\.tsx?$|\.ts$/g, ""), "i"),
          modulePath: path.resolve(p),
          type: rel
        });
      }
    }
  }
  walk(dir);

  return async function handler(req: Request) {
    const url = new URL(req.url);
    const isWs = req.headers.get("upgrade")?.toLowerCase() === "websocket";

    for (const r of routes) {
      const mod = await import(r.modulePath);

      if (r.type.includes("+ws") && isWs) {
        if (mod.WSHandler) return mod.WSHandler(req);
      }

      if (r.type.includes("+get") && req.method === "GET") {
        if (r.pattern.test(url.pathname)) {
          if (mod.GET) return mod.GET({ req, url, params: {} } as any);
        }
      }

      if (r.type.includes("+post") && req.method === "POST") {
        if (r.pattern.test(url.pathname)) {
          if (mod.POST) return mod.POST({ req, url, params: {} } as any);
        }
      }

      if (r.type.includes("+page") && req.method === "GET") {
        if (r.pattern.test(url.pathname)) {
          if (mod.GET) return mod.GET({ req, url, params: {} } as any);
        }
      }
    }

    return new Response("Not Found", { status: 404 });
  };
}
