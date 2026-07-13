import { defineStore } from "pinia";
import http, { CLIENT_ID } from "@/api/http";
import { BoardSocket } from "@/api/ws";
import type { Board, Card, Column, WsMessage } from "@/types";

const byPosition = (a: { position: number; id: number }, b: { position: number; id: number }) =>
  a.position - b.position || a.id - b.id;

interface BoardState {
  board: Board | null; // { id, title, columns: [{ id, title, position, cards: [...] }] }
  loading: boolean;
  error: unknown;
  socket: BoardSocket | null;
  live: boolean; // подключён ли WebSocket
}

export const useBoardStore = defineStore("board", {
  state: (): BoardState => ({
    board: null,
    loading: false,
    error: null,
    socket: null,
    live: false,
  }),
  getters: {
    columns: (s): Column[] => s.board?.columns ?? [],
  },
  actions: {
    // ── загрузка / realtime ──────────────────────────────
    async load(boardId: number | string): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await http.get<Board>(`/boards/${boardId}/`);
        data.columns.sort(byPosition);
        data.columns.forEach((c) => c.cards.sort(byPosition));
        this.board = data;
        this.connectWs(boardId);
      } catch (e) {
        this.error = e;
      } finally {
        this.loading = false;
      }
    },
    connectWs(boardId: number | string): void {
      this.disconnectWs();
      this.socket = new BoardSocket(boardId, (msg) => this.applyRemote(msg));
      this.socket.connect();
      this.live = true;
    },
    disconnectWs(): void {
      this.socket?.close();
      this.socket = null;
      this.live = false;
    },

    // ── локальные помощники ──────────────────────────────
    _column(id: number): Column | undefined {
      return this.board?.columns.find((c) => c.id === id);
    },
    _findCard(id: number): { col?: Column; card?: Card } {
      for (const col of this.board?.columns ?? []) {
        const card = col.cards.find((c) => c.id === id);
        if (card) return { col, card };
      }
      return {};
    },

    // ── колонки (CRUD через REST, локальный стейт обновляем сами) ─
    async addColumn(title: string): Promise<void> {
      const board = this.board;
      if (!board) return;
      const { data } = await http.post<Column>("/columns/", {
        board: board.id,
        title,
      });
      data.cards = data.cards ?? [];
      board.columns.push(data);
      board.columns.sort(byPosition);
    },
    async renameColumn(column: Column, title: string): Promise<void> {
      const { data } = await http.patch<Column>(`/columns/${column.id}/`, { title });
      column.title = data.title;
    },
    async deleteColumn(column: Column): Promise<void> {
      const board = this.board;
      if (!board) return;
      await http.delete(`/columns/${column.id}/`);
      board.columns = board.columns.filter((c) => c.id !== column.id);
    },

    // ── карточки ─────────────────────────────────────────
    async addCard(column: Column, title: string): Promise<void> {
      const { data } = await http.post<Card>("/cards/", { column: column.id, title });
      column.cards.push(data);
      column.cards.sort(byPosition);
    },
    async updateCard(card: Card, patch: Partial<Card>): Promise<void> {
      const { data } = await http.patch<Card>(`/cards/${card.id}/`, patch);
      Object.assign(card, data);
    },
    async deleteCard(card: Card): Promise<void> {
      await http.delete(`/cards/${card.id}/`);
      const { col } = this._findCard(card.id);
      if (col) col.cards = col.cards.filter((c) => c.id !== card.id);
    },

    // ── drag-and-drop (optimistic) ───────────────────────
    // vuedraggable уже переставил элементы в массивах через v-model.
    // Нам остаётся вычислить соседа и сохранить порядок на сервере.
    async onCardMoved(column: Column, newIndex: number): Promise<void> {
      const card = column.cards[newIndex];
      const after = newIndex > 0 ? column.cards[newIndex - 1].id : null;
      const snapshot = this._snapshot();
      try {
        await http.post(`/cards/${card.id}/move/`, {
          column: column.id,
          after,
        });
      } catch (e) {
        this._restore(snapshot); // откат оптимистичного изменения
        this.error = e;
      }
    },
    async onColumnMoved(newIndex: number): Promise<void> {
      const board = this.board;
      if (!board) return;
      const column = board.columns[newIndex];
      const after = newIndex > 0 ? board.columns[newIndex - 1].id : null;
      const snapshot = this._snapshot();
      try {
        await http.post(`/columns/${column.id}/move/`, { after });
      } catch (e) {
        this._restore(snapshot);
        this.error = e;
      }
    },
    _snapshot(): Column[] {
      return JSON.parse(JSON.stringify(this.board?.columns ?? []));
    },
    _restore(snapshot: Column[]): void {
      if (this.board) this.board.columns = snapshot;
    },

    // ── применение событий из WebSocket ──────────────────
    applyRemote(msg: WsMessage): void {
      // Собственное эхо игнорируем — изменение уже применено локально.
      if (msg.origin === CLIENT_ID) return;
      const board = this.board;
      if (!board) return;

      switch (msg.event) {
        case "card.created": {
          const col = this._column(msg.data.column);
          if (col && !col.cards.some((c) => c.id === msg.data.id)) {
            col.cards.push(msg.data);
            col.cards.sort(byPosition);
          }
          break;
        }
        case "card.updated": {
          const { card } = this._findCard(msg.data.id);
          if (card) Object.assign(card, msg.data);
          break;
        }
        case "card.moved": {
          const { col } = this._findCard(msg.data.id);
          if (col) col.cards = col.cards.filter((c) => c.id !== msg.data.id);
          const target = this._column(msg.data.column);
          if (target) {
            target.cards.push(msg.data);
            target.cards.sort(byPosition);
          }
          break;
        }
        case "card.deleted": {
          const { col } = this._findCard(msg.data.id);
          if (col) col.cards = col.cards.filter((c) => c.id !== msg.data.id);
          break;
        }
        case "column.created": {
          if (!this._column(msg.data.id)) {
            msg.data.cards = msg.data.cards ?? [];
            board.columns.push(msg.data);
            board.columns.sort(byPosition);
          }
          break;
        }
        case "column.updated":
        case "column.moved": {
          const col = this._column(msg.data.id);
          if (col) {
            col.title = msg.data.title;
            col.position = msg.data.position;
            board.columns.sort(byPosition);
          }
          break;
        }
        case "column.deleted": {
          board.columns = board.columns.filter((c) => c.id !== msg.data.id);
          break;
        }
        case "board.updated": {
          board.title = msg.data.title;
          break;
        }
      }
    },
  },
});
