<template>
  <div class="h-screen flex flex-col">
    <header
      class="flex items-center justify-between px-4 py-2.5 bg-default/75 backdrop-blur border-b border-default"
    >
      <div class="flex items-center gap-2">
        <UButton
          :to="{ name: 'boards' }"
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
          aria-label="К списку досок"
        />
        <strong v-if="store.board" class="text-highlighted">
          {{ store.board.title }}
        </strong>
      </div>
      <div class="flex items-center gap-1.5">
        <UBadge :color="store.live ? 'success' : 'error'" variant="subtle" size="sm">
          {{ store.live ? "● live" : "offline" }}
        </UBadge>
        <ThemeToggle />
      </div>
    </header>

    <p v-if="store.loading" class="p-6 text-muted">Загрузка доски…</p>
    <UAlert
      v-else-if="store.error"
      class="m-6 w-auto"
      color="error"
      variant="subtle"
      description="Не удалось загрузить доску."
    />

    <div v-else-if="store.board" class="flex-1 overflow-x-auto p-4 flex items-start gap-3">
      <draggable
        :list="store.board.columns"
        item-key="id"
        group="columns"
        handle=".col-header"
        class="flex gap-3 items-start"
        :animation="150"
        @change="onColumnChange"
      >
        <template #item="{ element }">
          <BoardColumn :column="element" />
        </template>
      </draggable>

      <form
        class="flex gap-1.5 shrink-0 min-w-60 p-2 rounded-lg bg-elevated/50"
        @submit.prevent="addColumn"
      >
        <UInput
          v-model="newColumn"
          placeholder="+ Добавить колонку"
          variant="soft"
          class="flex-1"
        />
        <UButton v-if="newColumn" type="submit">Добавить</UButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import draggable from "vuedraggable";
import BoardColumn from "@/components/BoardColumn.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
import { useBoardStore } from "@/stores/board";

// Событие vuedraggable @change (у пакета нет собственных типов).
interface DraggableChange {
  moved?: { newIndex: number; oldIndex: number };
  added?: { newIndex: number };
  removed?: { oldIndex: number };
}

const props = defineProps<{ id: string | number }>();
const store = useBoardStore();
const newColumn = ref("");

watch(
  () => props.id,
  (id) => store.load(id),
  { immediate: true },
);

onBeforeUnmount(() => store.disconnectWs());

async function addColumn() {
  if (!newColumn.value.trim()) return;
  await store.addColumn(newColumn.value.trim());
  newColumn.value = "";
}

function onColumnChange(evt: DraggableChange) {
  if (evt.moved) store.onColumnMoved(evt.moved.newIndex);
}
</script>
