<template>
  <UButton
    :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
    color="neutral"
    variant="ghost"
    :aria-label="isDark ? 'Включить светлую тему' : 'Включить тёмную тему'"
    @click="isDark = !isDark"
  />
</template>

<script setup>
import { computed } from "vue";
import { useColorMode } from "@vueuse/core";

// useColorMode вешает класс .dark на <html> и запоминает выбор
// в localStorage (по умолчанию — системная тема).
const colorMode = useColorMode();

const isDark = computed({
  get: () => colorMode.value === "dark",
  set: (v) => {
    colorMode.value = v ? "dark" : "light";
  },
});
</script>
