import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', () => {
  const isLoading = ref(false);
  const theme = ref('light');

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    theme.value = t;
  }

  return { isLoading, theme, applyTheme };
});
