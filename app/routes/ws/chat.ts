export function WSHandler(req: Request) {
  const { 0: socket, 1: response } = Bun.upgradeWebSocket(req);
  socket.onopen = () => {
    socket.send(JSON.stringify({ type: "welcome", message: "hello from bun ws" }));
  };
  socket.onmessage = (e) => {
    try {
      const d = typeof e.data === "string" ? e.data : new TextDecoder().decode(e.data);
      socket.send(JSON.stringify({ echo: d }));
    } catch (err) {}
  };
  socket.onclose = () => {};
  return response;
}
