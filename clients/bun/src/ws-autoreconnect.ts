import chalk from "chalk";
import querystring from "querystring";
import { WebsocketError } from "./ws-errors.enum";

export class WebSocketClient {
  private number = 0; // Message number
  private autoReconnectInterval = 5 * 1000; // ms
  private url: string;
  private token: string;
  private query: { [index: string]: string };
  private instance: WebSocket;
  private handlers: { open; message; close; error };

  public onopen: () => void;
  public onmessage: (msg: any) => void;
  public onclose: (codeOrError: number | Error, reason?: string) => void;
  public onerror: (err: Error) => void;

  open(url: string, token: string, query?: { [index: string]: string }) {
    this.url = url;
    this.token = token;
    this.query = query;

    query = query || {};

    if (this.instance) {
      this.close();
    }

    this.instance = new WebSocket(
      `${url}?${querystring.stringify({ ...query, token })}`
    );

    this.handlers = {
      open: this.openHandler.bind(this),
      message: this.messageHandler.bind(this),
      close: this.closeHandler.bind(this),
      error: this.errorHandler.bind(this),
    };

    this.instance.addEventListener("open", this.handlers.open);
    this.instance.addEventListener("message", this.handlers.message);
    this.instance.addEventListener("close", this.handlers.close);
    this.instance.addEventListener("error", this.handlers.error);
  }

  send(data: string | Buffer) {
    try {
      this.instance.send(data);
    } catch (err) {
      console.error(err);
    }
  }

  private reconnect(code: number | Error, reason?: string) {
    console.log(
      `${chalk.yellow("WebSocket:")} ${chalk.red(
        "disconnected with code: "
      )}${chalk.magenta(code.toString())}${chalk.red(
        ", reason: "
      )}${chalk.magenta(reason)}. ${chalk.red(
        `Retry in ${this.autoReconnectInterval}ms...`
      )}`
    );

    setTimeout(() => {
      console.log(`${chalk.yellow("WebSocket:")} reconnecting...`);
      this.open(this.url, this.token, this.query);
    }, this.autoReconnectInterval);
  }

  private removeAllListeners() {
    if (this.handlers) {
      this.instance.removeEventListener("open", this.handlers.open);
      this.instance.removeEventListener("message", this.handlers.message);
      this.instance.removeEventListener("error", this.handlers.error);
      this.instance.removeEventListener("close", this.handlers.close);
      this.handlers = null;
    }
  }

  close() {
    this.removeAllListeners();
    this.instance.close();
    this.instance = null;
  }

  openHandler() {
    this.onopen && this.onopen();
  }

  messageHandler(evt: MessageEvent<{ id: string; data: any }>) {
    const { type, data } = evt;
    this.number++;

    this.onmessage && this.onmessage(data);
  }

  errorHandler(ev: ErrorEvent) {
    console.error("WebSocket: error", arguments);
    this.onerror && this.onerror(ev.error);
  }

  closeHandler(ev: CloseEvent) {
    this.close();

    const { code, reason } = ev;

    switch (code) {
      case WebsocketError.NormalClosure:
        console.log(chalk.yellow("WebSocket:") + chalk.blue("normally closed"));
        break;

      // Custom error codes
      case 4000:
        console.log(
          chalk.yellow("WebSocket:") + chalk.red(" Invalid authentication")
        );
        break;
      default:
        // Abnormal closures
        this.reconnect(code, reason);
        break;
    }

    this.onclose && this.onclose(ev.code, ev.reason);
  }
}
