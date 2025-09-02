// scripts/check-package-manager.js
const ua = process.env.npm_config_user_agent || "";

console.log(ua);

if (!ua.includes("bun")) {
  console.error(`
❌ 检测到你在使用 ${ua.split(" ")[0]} 安装依赖。
请使用 Bun 安装依赖：
   bun install
`);
  process.exit(1);
}
