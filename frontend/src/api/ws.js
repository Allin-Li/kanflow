import { tokens } from "./http";

const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:8000";

/**
 * WebSocket-подключение к одной доске с авто-переподключением.
 * onEvent({ event, data, origin }) вызывается на каждое серверное событие.
 */
export class BoardSocket {
  constructor(boardId, onEvent) {
    this.boardId = boardId;
    this.onEvent = onEvent;
    this.ws = null;
    this.closed = false;
    this.retry = 0;
    this.pingTimer = null;
  }

  connect() {
    const url = `${WS_BASE}/ws/boards/${this.boardId}/?token=${tokens.access ?? ""}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.retry = 0;
      // keep-alive пинги
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN)
          this.ws.send(JSON.stringify({ type: "ping" }));
      }, 25000);
    };

    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event) this.onEvent(msg);
    };

    this.ws.onclose = () => {
      clearInterval(this.pingTimer);
      if (this.closed) return;
      // экспоненциальный backoff с потолком 10с
      const delay = Math.min(1000 * 2 ** this.retry++, 10000);
      setTimeout(() => this.connect(), delay);
    };

    this.ws.onerror = () => this.ws?.close();
  }

  close() {
    this.closed = true;
    clearInterval(this.pingTimer);
    this.ws?.close();
  }
}
