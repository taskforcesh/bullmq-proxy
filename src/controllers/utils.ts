import { ServerWebSocket } from "bun";

const RETRY_TIMEOUT = 1000;

export function respond(ws: ServerWebSocket<any>, id: number, data: any = {}) {
  const response = JSON.stringify({
    id,
    data,
  });

  send(ws, response);
}

export function send(ws: ServerWebSocket<any>, data: string | Buffer) {
  if (ws.readyState == 2 || ws.readyState == 3) {
    return;
  }
  const ok = ws.send(data);
  if (ok === 0) {
    setTimeout(() => send(ws, data), RETRY_TIMEOUT);
  }
}

