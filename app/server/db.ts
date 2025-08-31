import { Database } from "bun:sqlite";

export const db = new Database("app.db");

try {
  db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT)`);
  const rows = db.query("SELECT COUNT(*) FROM users").all();
  const count = rows[0] ? rows[0][0] : 0;
  if (!count) {
    db.run("INSERT INTO users (id, name) VALUES (?, ?)", "1", "Ada Lovelace");
    db.run("INSERT INTO users (id, name) VALUES (?, ?)", "2", "Alan Turing");
  }
} catch (e) {
  console.error(e);
}

export const commonMiddleware = (next: any) => async (ctx: any) => {
  ctx.locals = ctx.locals || {};
  ctx.locals.db = db;
  return next(ctx);
};
