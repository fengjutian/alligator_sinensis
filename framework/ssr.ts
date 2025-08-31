import React, { JSX } from "react";
import { renderToReadableStream } from "react-dom/server";
import ReactDOMServer from "react-dom/server";

export async function renderPage(content: JSX.Element, opts: { title?: string } = {}) {
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${opts.title || "Bun App"}</title>
    </head>
    <body>
      <div id="root">${await ReactDOMServer.renderToString(content)}</div>
      <script src="/client.js"></script>
    </body>
  </html>
  `;
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
