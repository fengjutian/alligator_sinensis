import React from "react";
import { renderToReadableStream } from "react-dom/server";

export async function renderPage(jsx: JSX.Element, opts: { title?: string } = {}) {
  const stream = await renderToReadableStream(
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{opts.title || "Bun App"}</title>
      </head>
      <body>
        <div id="root">{jsx}</div>
        <script dangerouslySetInnerHTML={{ __html: `/* client bundle placeholder */` }} />
      </body>
    </html>
  );
  return new Response(stream, { headers: { "Content-Type": "text/html" } });
}
