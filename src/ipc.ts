import { v4 as uuidv4 } from "uuid";
import NodeWebSocket from "ws";

export default class IPC {
  private app: string;
  private commandHandler: any;
  private connected: boolean = false;
  private id: string = "";
  private websocket?: WebSocket | NodeWebSocket;
  private url: string = "ws://localhost:17373/";

  constructor(commandHandler: any, app: string) {
    this.commandHandler = commandHandler;
    this.app = app;
    this.id = uuidv4();
  }

  isConnected() {
    return this.connected;
  }

  private onClose() {
    this.connected = false;
  }

  private async onMessage(message: any) {
    if (typeof message === "string") {
      let request;
      try {
        request = JSON.parse(message);
      } catch (e) {
        return;
      }

      if (request.message === "response") {
        const result = await this.handle(request.data.response);
        if (result) {
          this.send("callback", {
            callback: request.data.callback,
            data: result,
          });
        }
      }
    }
  }

  private onOpen() {
    this.connected = true;
    this.sendActive();
  }

  ensureConnection() {
    if (this.connected) {
      return;
    }

    try {
      if (typeof WebSocket !== "undefined" && WebSocket) {
        this.websocket = new WebSocket(this.url);

        this.websocket.addEventListener("open", () => {
          this.onOpen();
        });

        this.websocket.addEventListener("close", () => {
          this.onClose();
        });

        this.websocket.addEventListener("message", (event) => {
          this.onMessage(event.data);
        });
      } else {
        this.websocket = new NodeWebSocket(this.url);

        this.websocket.on("open", () => {
          this.onOpen();
        });

        this.websocket.on("close", () => {
          this.onClose();
        });

        this.websocket.on("message", (message) => {
          this.onMessage(message);
        });
      }
    } catch (e) {}
  }

  async handle(response: any): Promise<any> {
    let result = null;
    if (response.execute) {
      for (const command of response.execute.commandsList) {
        if (command.type in (this.commandHandler as any)) {
          result = await (this.commandHandler as any)[command.type](command);
        }
      }
    }

    if (result) {
      return result;
    }

    return {
      message: "completed",
      data: {},
    };
  }

  sendActive() {
    let result = this.send("active", {
      app: this.app,
      id: this.id,
    });
  }

  send(message: string, data: any) {
    if (!this.connected || !this.websocket || this.websocket!.readyState != 1) {
      return false;
    }

    try {
      this.websocket!.send(JSON.stringify({ message, data }));
      return true;
    } catch (e) {
      this.connected = false;
      return false;
    }
  }

  start() {
    this.ensureConnection();

    setInterval(() => {
      this.ensureConnection();
    }, 1000);

    setInterval(() => {
      this.send("heartbeat", {
        app: this.app,
        id: this.id,
      });
    }, 60 * 1000);
  }
}
