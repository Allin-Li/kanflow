<template>
  <div class="auth">
    <form class="card" @submit.prevent="submit">
      <h1>{{ isRegister ? "Регистрация" : "Вход" }}</h1>

      <label>Имя пользователя<input v-model="username" required /></label>
      <label v-if="isRegister"
        >Email<input v-model="email" type="email"
      /></label>
      <label
        >Пароль<input v-model="password" type="password" required minlength="8"
      /></label>

      <p v-if="error" class="err">{{ error }}</p>

      <button type="submit" :disabled="busy">
        {{ isRegister ? "Создать аккаунт" : "Войти" }}
      </button>

      <p class="switch">
        {{ isRegister ? "Уже есть аккаунт?" : "Нет аккаунта?" }}
        <a href="#" @click.prevent="isRegister = !isRegister">
          {{ isRegister ? "Войти" : "Зарегистрироваться" }}
        </a>
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const isRegister = ref(false);
const username = ref("");
const email = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);

async function submit() {
  error.value = "";
  busy.value = true;
  try {
    if (isRegister.value) {
      await auth.register(username.value, email.value, password.value);
    } else {
      await auth.login(username.value, password.value);
    }
    router.push(route.query.next || { name: "boards" });
  } catch (e) {
    error.value =
      e.response?.data?.detail ||
      Object.values(e.response?.data ?? {})?.[0]?.[0] ||
      "Не удалось выполнить запрос";
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.auth {
  min-height: 100vh;
  display: grid;
  place-items: center;
}
.card {
  background: var(--surface);
  padding: 28px;
  border-radius: 8px;
  width: 340px;
  box-shadow: 0 1px 6px rgba(9, 30, 66, 0.15);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
h1 {
  margin: 0 0 6px;
  font-size: 22px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--muted);
}
.err {
  color: #bf2600;
  margin: 0;
  font-size: 13px;
}
.switch {
  font-size: 13px;
  text-align: center;
  margin: 4px 0 0;
}
</style>
