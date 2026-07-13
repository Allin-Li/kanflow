<template>
  <div class="min-h-screen">
    <header
      class="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-default/75 backdrop-blur border-b border-default"
    >
      <strong class="text-highlighted">Мои доски</strong>
      <div class="flex items-center gap-1.5">
        <span v-if="auth.user" class="text-sm text-muted mr-1">
          {{ auth.user.username }}
        </span>
        <ThemeToggle />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-log-out"
          aria-label="Выйти"
          @click="logout"
        />
      </div>
    </header>

    <UContainer class="max-w-3xl py-6">
      <form class="flex gap-2 mb-6" @submit.prevent="create">
        <UInput
          v-model="title"
          placeholder="Название новой доски"
          icon="i-lucide-kanban"
          class="flex-1"
          required
        />
        <UButton type="submit" icon="i-lucide-plus">Создать</UButton>
      </form>

      <div v-if="loading" class="flex justify-center py-10">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
      </div>

      <ul v-else class="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
        <li v-for="b in boards" :key="b.id">
          <router-link
            :to="{ name: 'board', params: { id: b.id } }"
            class="block px-4 py-6 rounded-lg bg-default ring ring-default shadow-sm font-semibold text-default hover:ring-primary hover:shadow transition"
          >
            {{ b.title }}
          </router-link>
        </li>
        <li v-if="!boards.length" class="text-muted col-span-full">
          Пока нет досок — создайте первую.
        </li>
      </ul>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import http from "@/api/http";
import { useAuthStore } from "@/stores/auth";
import ThemeToggle from "@/components/ThemeToggle.vue";
import type { BoardSummary } from "@/types";

const auth = useAuthStore();
const router = useRouter();
const boards = ref<BoardSummary[]>([]);
const title = ref("");
const loading = ref(true);

async function fetchBoards() {
  loading.value = true;
  const { data } = await http.get<BoardSummary[]>("/boards/");
  boards.value = data;
  loading.value = false;
}

async function create() {
  const { data } = await http.post<BoardSummary>("/boards/", { title: title.value });
  title.value = "";
  router.push({ name: "board", params: { id: data.id } });
}

function logout() {
  auth.logout();
  router.push({ name: "login" });
}

onMounted(fetchBoards);
</script>
