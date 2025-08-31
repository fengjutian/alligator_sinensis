import React from "react";
import { renderPage } from "../../framework/ssr";

function Page() {
  return (
    <main>
      <h1>Hello Bun 全栈模板</h1>
      <p>REST: <a href="/api/users">/api/users</a></p>
      <p>RPC: POST /api/rpc {"{method,params}"}</p>
      <p>WebSocket: ws://localhost:3000/ws/chat</p>
    </main>
  );
}

export const GET = async () => renderPage(<Page />);
