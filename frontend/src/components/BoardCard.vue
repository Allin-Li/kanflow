<template>
  <div class="card" @click="editing = true">
    <template v-if="!editing">
      <div class="title">{{ card.title }}</div>
      <div v-if="labels.length" class="labels">
        <span
          v-for="l in labels"
          :key="l"
          class="label"
          :style="{ background: l }"
        />
      </div>
      <div v-if="card.description" class="desc-mark">≡</div>
    </template>

    <form v-else class="edit" @submit.prevent="save" @click.stop>
      <input v-model="draftTitle" autofocus />
      <textarea v-model="draftDesc" placeholder="Описание…" rows="3" />
      <div class="row">
        <button type="submit">Сохранить</button>
        <button type="button" class="ghost" @click="editing = false">
          Отмена
        </button>
        <button type="button" class="ghost danger" @click="remove">
          Удалить
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useBoardStore } from "@/stores/board";

const props = defineProps({ card: { type: Object, required: true } });
const store = useBoardStore();

const editing = ref(false);
const draftTitle = ref(props.card.title);
const draftDesc = ref(props.card.description);

// meta (JSONB) — гибкие поля. Пример: цветные лейблы.
const labels = computed(() => props.card.meta?.labels ?? []);

async function save() {
  await store.updateCard(props.card, {
    title: draftTitle.value,
    description: draftDesc.value,
  });
  editing.value = false;
}

async function remove() {
  await store.deleteCard(props.card);
}
</script>

<style scoped>
.card {
  background: var(--surface);
  border-radius: 6px;
  padding: 8px 10px;
  box-shadow: 0 1px 2px rgba(9, 30, 66, 0.2);
  cursor: pointer;
  font-size: 14px;
}
.labels {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}
.label {
  width: 32px;
  height: 6px;
  border-radius: 3px;
}
.desc-mark {
  color: var(--muted);
  font-size: 12px;
  margin-top: 4px;
}
.edit {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row {
  display: flex;
  gap: 6px;
}
.danger {
  color: #bf2600;
}
</style>
