import { defineStore } from "pinia";
import http, { CLIENT_ID } from "@/api/http";
import { BoardSocket } from "@/api/ws";

const byPosition = (a, b) => a.position - b.position || a.id - b.id;

export const useBoardStore = defineStore("board", {
  state: () => ({
    board: null, // { id, title, columns: [{ id, title, position, cards: [...] }] }
    loading: false,
    error: null,
    socket: null,
    live: false, // подключён ли WebSocket
  }),
  getters: {
    columns: (s) => s.board?.columns ?? [],
  },
  actions: {
    // ── загрузка / realtime ──────────────────────────────
    async load(boardId) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await http.get(`/boards/${boardId}/`);
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
    connectWs(boardId) {
      this.disconnectWs();
      this.socket = new BoardSocket(boardId, (msg) => this.applyRemote(msg));
      this.socket.connect();
      this.live = true;
    },
    disconnectWs() {
      this.socket?.close();
      this.socket = null;
      this.live = false;
    },

    // ── локальные помощники ──────────────────────────────
    _column(id) {
      return this.board?.columns.find((c) => c.id === id);
    },
    _findCard(id) {
      for (const col of this.board?.columns ?? []) {
        const card = col.cards.find((c) => c.id === id);
        if (card) return { col, card };
      }
      return {};
    },

    // ── колонки (CRUD через REST, локальный стейт обновляем сами) ─
    async addColumn(title) {
      const { data } = await http.post("/columns/", {
        board: this.board.id,
        title,
      });
      data.cards = data.cards ?? [];
      this.board.columns.push(data);
      this.board.columns.sort(byPosition);
    },
    async renameColumn(column, title) {
      const { data } = await http.patch(`/columns/${column.id}/`, { title });
      column.title = data.title;
    },
    async deleteColumn(column) {
      await http.delete(`/columns/${column.id}/`);
      this.board.columns = this.board.columns.filter((c) => c.id !== column.id);
    },

    // ── карточки ─────────────────────────────────────────
    async addCard(column, title) {
      const { data } = await http.post("/cards/", { column: column.id, title });
      column.cards.push(data);
      column.cards.sort(byPosition);
    },
    async updateCard(card, patch) {
      const { data } = await http.patch(`/cards/${card.id}/`, patch);
      Object.assign(card, data);
    },
    async deleteCard(card) {
      await http.delete(`/cards/${card.id}/`);
      const { col } = this._findCard(card.id);
      if (col) col.cards = col.cards.filter((c) => c.id !== card.id);
    },

    // ── drag-and-drop (optimistic) ───────────────────────
    // vuedraggable уже переставил элементы в массивах через v-model.
    // Нам остаётся вычислить соседа и сохранить порядок на сервере.
    async onCardMoved(column, newIndex) {
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
    async onColumnMoved(newIndex) {
      const column = this.board.columns[newIndex];
      const after = newIndex > 0 ? this.board.columns[newIndex - 1].id : null;
      const snapshot = this._snapshot();
      try {
        await http.post(`/columns/${column.id}/move/`, { after });
      } catch (e) {
        this._restore(snapshot);
        this.error = e;
      }
    },
    _snapshot() {
      return JSON.parse(JSON.stringify(this.board.columns));
    },
    _restore(snapshot) {
      this.board.columns = snapshot;
    },

    // ── применение событий из WebSocket ──────────────────
    applyRemote({ event, data, origin }) {
      // Собственное эхо игнорируем — изменение уже применено локально.
      if (origin === CLIENT_ID) return;
      if (!this.board) return;

      switch (event) {
        case "card.created": {
          const col = this._column(data.column);
          if (col && !col.cards.some((c) => c.id === data.id)) {
            col.cards.push(data);
            col.cards.sort(byPosition);
          }
          break;
        }
        case "card.updated": {
          const { card } = this._findCard(data.id);
          if (card) Object.assign(card, data);
          break;
        }
        case "card.moved": {
          const { col } = this._findCard(data.id);
          if (col) col.cards = col.cards.filter((c) => c.id !== data.id);
          const target = this._column(data.column);
          if (target) {
            target.cards.push(data);
            target.cards.sort(byPosition);
          }
          break;
        }
        case "card.deleted": {
          const { col } = this._findCard(data.id);
          if (col) col.cards = col.cards.filter((c) => c.id !== data.id);
          break;
        }
        case "column.created": {
          if (!this._column(data.id)) {
            data.cards = data.cards ?? [];
            this.board.columns.push(data);
            this.board.columns.sort(byPosition);
          }
          break;
        }
        case "column.updated":
        case "column.moved": {
          const col = this._column(data.id);
          if (col) {
            col.title = data.title;
            col.position = data.position;
            this.board.columns.sort(byPosition);
          }
          break;
        }
        case "column.deleted": {
          this.board.columns = this.board.columns.filter((c) => c.id !== data.id);
          break;
        }
        case "board.updated": {
          this.board.title = data.title;
          break;
        }
      }
    },
  },
});
