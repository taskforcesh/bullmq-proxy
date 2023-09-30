import { ServerWebSocket } from "bun";

export interface WebSocketBehaviour<WebSocketData = any> {
  message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer): void;
  open(ws: ServerWebSocket<WebSocketData>): void;
  close(
    ws: ServerWebSocket<WebSocketData>,
    code: number,
    message: string
  ): void;
  drain(ws: ServerWebSocket<WebSocketData>): void;
}
