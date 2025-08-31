import { z } from "zod";
import { db } from "../../server/db";

const bodySchema = z.object({ method: z.string(), params: z.any() });

const rpc = {
  async getUsers() {
    const rows = db.query("SELECT id, name FROM users").all();
    return rows.map((r: any) => ({ id: r[0], name: r[1] }));
  },
};

export const POST = async ({ req }: { req: Request }) => {
  const payload = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return new Response(JSON.stringify({ error: "invalid body" }), { status: 400 });

  const { method, params } = parsed.data;
  const fn = (rpc as any)[method];
  if (!fn) return new Response(JSON.stringify({ error: "method not found" }), { status: 404 });

  const result = await fn(params);
  return new Response(JSON.stringify({ data: result }), { headers: { "Content-Type": "application/json" } });
};
