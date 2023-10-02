import { WebSocketClient } from "./ws-autoreconnect";
import { Message } from "@taskforcesh/message-broker";

export interface ConnectOpts {
  host: string;
  token: string;
  queueName: string;
  query?: object;
}

export interface Command<FN extends string, ARGS extends any[]> {
  fn: FN;
  args: ARGS;
}

export function connect<T>(
  url: string,
  token: string,
  query: { [index: string]: string } = {},
  onMessage: (msg: Message<T>) => void
): Promise<WebSocketClient> {
  const ws = new WebSocketClient();

  ws.open(url, token, query);

  ws.onmessage = (msg) => {
    if (msg) {
      try {
        const { id, data } = JSON.parse(msg);
        onMessage({ id, data });
      } catch (err) {
        console.error("Error processing incoming message", err);
      }
    }
  };

  return new Promise((resolve, reject) => {
    ws.onerror = function error(err) {
      console.error("Error opening WebSocket", err);
      ws.onerror = null;
      ws.onopen = null;
      reject(err);
    };

    ws.onopen = function open() {
      console.log("Succesfully connected to", url);
      ws.onerror = null;
      ws.onopen = null;
      resolve(ws);
    };
  });
}

export function respond(ws: WebSocketClient, id: number, data: object) {
  ws.send(
    JSON.stringify({
      id,
      data,
    })
  );
}
