import { tokens } from "./http";
import type { WsMessage } from "@/types";

const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:8000";

export type WsEventHandler = (msg: WsMessage) => void;

/**
 * WebSocket-подключение к одной доске с авто-переподключением.
 * onEvent(msg) вызывается на каждое серверное событие.
 */
export class BoardSocket {
  private readonly boardId: number | string;
  private readonly onEvent: WsEventHandler;
  private ws: WebSocket | null = null;
  private closed = false;
  private retry = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(boardId: number | string, onEvent: WsEventHandler) {
    this.boardId = boardId;
    this.onEvent = onEvent;
  }

  connect(): void {
    const url = `${WS_BASE}/ws/boards/${this.boardId}/?token=${tokens.access ?? ""}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.retry = 0;
      // keep-alive пинги
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "ping" }));
      }, 25000);
    };

    this.ws.onmessage = (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as WsMessage;
      if (msg.event) this.onEvent(msg);
    };

    this.ws.onclose = () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      if (this.closed) return;
      // экспоненциальный backoff с потолком 10с
      const delay = Math.min(1000 * 2 ** this.retry++, 10000);
      setTimeout(() => this.connect(), delay);
    };

    this.ws.onerror = () => this.ws?.close();
  }

  close(): void {
    this.closed = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
  }
}
