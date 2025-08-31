import { db } from "../../server/db";

export const GET = async () => {
  const rows = db.query("SELECT id, name FROM users").all();
  const users = rows.map((r: any) => ({ id: r[0], name: r[1] }));
  return new Response(JSON.stringify(users), { headers: { "Content-Type": "application/json" } });
};
