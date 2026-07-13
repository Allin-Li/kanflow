<template>
  <div class="min-h-screen grid place-items-center p-4">
    <UCard class="w-full max-w-sm backdrop-blur">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold text-highlighted">
            {{ isRegister ? "Регистрация" : "Вход" }}
          </h1>
          <ThemeToggle />
        </div>

        <UFormField label="Имя пользователя" required>
          <UInput v-model="username" class="w-full" required autofocus />
        </UFormField>

        <UFormField v-if="isRegister" label="Email">
          <UInput v-model="email" type="email" class="w-full" />
        </UFormField>

        <UFormField label="Пароль" required>
          <UInput v-model="password" type="password" class="w-full" required minlength="8" />
        </UFormField>

        <UAlert v-if="error" color="error" variant="subtle" :description="error" />

        <UButton type="submit" block :loading="busy">
          {{ isRegister ? "Создать аккаунт" : "Войти" }}
        </UButton>

        <p class="text-sm text-center text-muted">
          {{ isRegister ? "Уже есть аккаунт?" : "Нет аккаунта?" }}
          <UButton variant="link" color="primary" class="p-0" @click="isRegister = !isRegister">
            {{ isRegister ? "Войти" : "Зарегистрироваться" }}
          </UButton>
        </p>
      </form>
    </UCard>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import ThemeToggle from "@/components/ThemeToggle.vue";

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
