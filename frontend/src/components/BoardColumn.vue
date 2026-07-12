<template>
  <div class="column">
    <header class="col-header">
      <input
        v-if="renaming"
        v-model="draftTitle"
        @blur="saveTitle"
        @keyup.enter="saveTitle"
        autofocus
      />
      <h3 v-else @dblclick="renaming = true">{{ column.title }}</h3>
      <button class="ghost" title="Удалить колонку" @click="remove">×</button>
    </header>

    <draggable
      :list="column.cards"
      item-key="id"
      group="cards"
      class="cards"
      :animation="150"
      ghost-class="drag-ghost"
      chosen-class="drag-chosen"
      @change="onChange"
    >
      <template #item="{ element }">
        <BoardCard :card="element" />
      </template>
    </draggable>

    <form class="add" @submit.prevent="addCard">
      <input v-model="newCard" placeholder="+ Добавить карточку" />
      <button v-if="newCard" type="submit">Добавить</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import draggable from "vuedraggable";
import BoardCard from "./BoardCard.vue";
import { useBoardStore } from "@/stores/board";

const props = defineProps({ column: { type: Object, required: true } });
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
function onChange(evt) {
  const change = evt.added || evt.moved;
  if (change) store.onCardMoved(props.column, change.newIndex);
}
</script>

<style scoped>
.column {
  background: var(--col-bg);
  border-radius: 8px;
  width: 272px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
}
.col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  cursor: grab;
}
.col-header h3 {
  margin: 0;
  font-size: 15px;
}
.cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 8px;
  overflow-y: auto;
  min-height: 8px;
  flex: 1;
}
.add {
  padding: 8px;
}
</style>
