<template>
  <div
    class="rounded-md bg-default ring ring-default shadow-sm px-2.5 py-2 text-sm cursor-pointer hover:ring-primary/50 transition"
    @click="editing = true"
  >
    <template v-if="!editing">
      <div class="text-default">{{ card.title }}</div>
      <div v-if="labels.length" class="flex gap-1 mt-1.5">
        <span
          v-for="l in labels"
          :key="l"
          class="w-8 h-1.5 rounded-full"
          :style="{ background: l }"
        />
      </div>
      <UIcon v-if="card.description" name="i-lucide-text" class="size-3.5 text-dimmed mt-1" />
    </template>

    <form v-else class="flex flex-col gap-1.5" @submit.prevent="save" @click.stop>
      <UInput v-model="draftTitle" size="sm" autofocus />
      <UTextarea v-model="draftDesc" placeholder="Описание…" :rows="3" size="sm" />
      <div class="flex gap-1.5">
        <UButton type="submit" size="xs">Сохранить</UButton>
        <UButton type="button" color="neutral" variant="ghost" size="xs" @click="editing = false">
          Отмена
        </UButton>
        <UButton type="button" color="error" variant="ghost" size="xs" @click="remove">
          Удалить
        </UButton>
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
