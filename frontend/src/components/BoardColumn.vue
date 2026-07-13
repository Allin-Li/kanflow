<template>
  <div
    class="w-68 shrink-0 flex flex-col max-h-[calc(100vh-7.5rem)] rounded-lg bg-elevated/80 backdrop-blur ring ring-default"
  >
    <header class="col-header flex items-center justify-between gap-2 px-2.5 py-2 cursor-grab">
      <UInput
        v-if="renaming"
        v-model="draftTitle"
        size="sm"
        autofocus
        @blur="saveTitle"
        @keyup.enter="saveTitle"
      />
      <h3 v-else class="m-0 text-sm font-semibold text-highlighted" @dblclick="renaming = true">
        {{ column.title }}
      </h3>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-x"
        title="Удалить колонку"
        @click="remove"
      />
    </header>

    <draggable
      :list="column.cards"
      item-key="id"
      group="cards"
      class="flex flex-col gap-2 px-2 py-1 overflow-y-auto min-h-2 flex-1"
      :animation="150"
      ghost-class="drag-ghost"
      chosen-class="drag-chosen"
      @change="onChange"
    >
      <template #item="{ element }">
        <BoardCard :card="element" />
      </template>
    </draggable>

    <form class="flex gap-1.5 p-2" @submit.prevent="addCard">
      <UInput
        v-model="newCard"
        placeholder="+ Добавить карточку"
        variant="soft"
        size="sm"
        class="flex-1"
      />
      <UButton v-if="newCard" type="submit" size="sm">Добавить</UButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import draggable from "vuedraggable";
import BoardCard from "./BoardCard.vue";
import { useBoardStore } from "@/stores/board";
import type { Column } from "@/types";

// Событие vuedraggable @change (у пакета нет собственных типов).
interface DraggableChange {
  added?: { newIndex: number };
  moved?: { newIndex: number; oldIndex: number };
  removed?: { oldIndex: number };
}

const props = defineProps<{ column: Column }>();
const store = useBoardStore();

const newCard = ref("");
const renaming = ref(false);
const draftTitle = ref(props.column.title);

async function addCard() {
  if (!newCard.value.trim()) return;
  await store.addCard(props.column, newCard.value.trim());
  newCard.value = "";
}

async function saveTitle() {
  renaming.value = false;
  if (draftTitle.value !== props.column.title) {
    await store.renameColumn(props.column, draftTitle.value);
  }
}

async function remove() {
  if (confirm(`Удалить колонку «${props.column.title}» со всеми карточками?`)) {
    await store.deleteColumn(props.column);
  }
}

// vuedraggable мутирует column.cards через :list. Реагируем на появление
// (added — перенос из другой колонки) и перестановку внутри (moved).
function onChange(evt: DraggableChange) {
  const change = evt.added || evt.moved;
  if (change) store.onCardMoved(props.column, change.newIndex);
}
</script>
