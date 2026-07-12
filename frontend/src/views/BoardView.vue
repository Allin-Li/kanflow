<template>
  <div class="page">
    <div class="topbar">
      <div class="left">
        <router-link class="ghost back" :to="{ name: 'boards' }">←</router-link>
        <strong v-if="store.board">{{ store.board.title }}</strong>
      </div>
      <div class="right">
        <span class="live-badge" :class="{ off: !store.live }">
          {{ store.live ? "● live" : "offline" }}
        </span>
      </div>
    </div>

    <p v-if="store.loading" class="info">Загрузка доски…</p>
    <p v-else-if="store.error" class="info err">Не удалось загрузить доску.</p>

    <div v-else-if="store.board" class="board">
      <draggable
        :list="store.board.columns"
        item-key="id"
        group="columns"
        handle=".col-header"
        class="columns"
        :animation="150"
        @change="onColumnChange"
      >
        <template #item="{ element }">
          <BoardColumn :column="element" />
        </template>
      </draggable>

      <form class="add-col" @submit.prevent="addColumn">
        <input v-model="newColumn" placeholder="+ Добавить колонку" />
        <button v-if="newColumn" type="submit">Добавить</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import draggable from "vuedraggable";
import BoardColumn from "@/components/BoardColumn.vue";
import { useBoardStore } from "@/stores/board";

const props = defineProps({ id: { type: [String, Number], required: true } });
const store = useBoardStore();
const newColumn = ref("");

watch(
  () => props.id,
  (id) => store.load(id),
  { immediate: true }
);

onBeforeUnmount(() => store.disconnectWs());

async function addColumn() {
  if (!newColumn.value.trim()) return;
  await store.addColumn(newColumn.value.trim());
  newColumn.value = "";
}

function onColumnChange(evt) {
  if (evt.moved) store.onColumnMoved(evt.moved.newIndex);
}
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.left,
.right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.back {
  text-decoration: none;
  font-size: 18px;
}
.board {
  flex: 1;
  overflow-x: auto;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.columns {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.add-col {
  display: flex;
  gap: 6px;
  flex: 0 0 auto;
  min-width: 240px;
  background: rgba(9, 30, 66, 0.04);
  padding: 8px;
  border-radius: 8px;
}
.info {
  padding: 24px;
}
.err {
  color: #bf2600;
}
</style>
