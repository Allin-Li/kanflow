// Доменные типы Kanflow. Форма соответствует сериализаторам DRF на бэкенде.

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Tokens {
  access: string;
  refresh: string;
}

// Гибкие поля карточки (JSONB на бэкенде). Пример — цветные лейблы.
export interface CardMeta {
  labels?: string[];
  [key: string]: unknown;
}

export interface Card {
  id: number;
  column: number;
  title: string;
  description: string;
  position: number;
  meta: CardMeta;
}

export interface Column {
  id: number;
  board: number;
  title: string;
  position: number;
  cards: Card[];
}

export interface Board {
  id: number;
  title: string;
  columns: Column[];
}

// Элемент списка досок (без вложенных колонок).
export interface BoardSummary {
  id: number;
  title: string;
}

// События, приходящие по WebSocket. Дискриминируются полем event; data —
// сериализованная сущность (или {id} для удалений).
export type WsMessage =
  | { event: "card.created" | "card.updated" | "card.moved"; data: Card; origin: string }
  | { event: "card.deleted"; data: { id: number }; origin: string }
  | { event: "column.created" | "column.updated" | "column.moved"; data: Column; origin: string }
  | { event: "column.deleted"; data: { id: number }; origin: string }
  | { event: "board.updated"; data: Board; origin: string };
