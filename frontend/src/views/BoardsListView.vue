<template>
  <div>
    <div class="topbar">
      <strong>Мои доски</strong>
      <div>
        <span v-if="auth.user" class="muted">{{ auth.user.username }}</span>
        <button class="ghost" @click="logout">Выйти</button>
      </div>
    </div>

    <div class="wrap">
      <form class="new" @submit.prevent="create">
        <input v-model="title" placeholder="Название новой доски" required />
        <button type="submit">Создать</button>
      </form>

      <p v-if="loading">Загрузка…</p>
      <ul v-else class="grid">
        <li v-for="b in boards" :key="b.id">
          <router-link :to="{ name: 'board', params: { id: b.id } }">
            {{ b.title }}
          </router-link>
        </li>
        <li v-if="!boards.length" class="muted">Пока нет досок — создайте первую.</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import http from "@/api/http";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();
const boards = ref([]);
const title = ref("");
const loading = ref(true);

async function fetchBoards() {
  loading.value = true;
  const { data } = await http.get("/boards/");
  boards.value = data;
  loading.value = false;
}

async function create() {
  const { data } = await http.post("/boards/", { title: title.value });
  title.value = "";
  router.push({ name: "board", params: { id: data.id } });
}

function logout() {
  auth.logout();
  router.push({ name: "login" });
}

onMounted(fetchBoards);
</script>

<style scoped>
.wrap {
  max-width: 720px;
  margin: 24px auto;
  padding: 0 16px;
}
.new {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.grid {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.grid li a {
  display: block;
  padding: 24px 16px;
  background: var(--surface);
  border-radius: 8px;
  text-decoration: none;
  color: var(--text);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(9, 30, 66, 0.12);
}
.muted {
  color: var(--muted);
}
</style>
