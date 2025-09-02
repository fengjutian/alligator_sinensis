import React, { JSX } from "react";
import { renderToReadableStream } from "react-dom/server";
import ReactDOMServer from "react-dom/server";

export async function renderPage(content: JSX.Element, opts: { title?: string; initialData?: Record<string, any> } = {}) {
  const { title = "Bun App", initialData = {} } = opts;
  
  // 将初始数据序列化为JSON字符串
  const initialDataJson = JSON.stringify(initialData).replace(/</g, '\\u003c');
  
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
    </head>
    <body>
      <div id="root">${await ReactDOMServer.renderToString(content)}</div>
      <!-- 嵌入初始数据 -->
      <script>window.__INITIAL_DATA__ = ${initialDataJson};</script>
      <!-- 客户端脚本 -->
      <script src="/client.js"></script>
    </body>
  </html>
  `;
  
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
