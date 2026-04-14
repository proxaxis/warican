<script setup>
import { onMounted, onUnmounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useUserStore } from '@/stores/user'
import LoadingSpinner from './components/LoadingSpinner.vue'

const userStore = useUserStore()

onMounted(() => {
  userStore.isLoading = true
  // システムのテーマ設定を取得
  const systemTheme = (() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })()

  // システムテーマを取得して適用
  userStore.applyTheme(systemTheme)

  // システムテーマの変更を監視
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleThemeChange = (e) => {
    userStore.applyTheme(e.matches ? 'dark' : 'light')
  }
  mediaQuery.addEventListener('change', handleThemeChange)

  userStore.isLoading = false
})

onUnmounted(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.removeEventListener('change', handleThemeChange)
})
</script>

<template>
  <AppHeader />

  <main class="views-wrapper">
    <router-view />
  </main>

  <LoadingSpinner v-if="userStore.isLoading" />

  <AppFooter />
</template>

<style lang="scss">
@use 'sass:map';
@use '@/styles/variables.scss' as var;

:root {
  color-scheme: light dark;
  --border-radius: 6px;
  --header-height: 60px;
}

:root[data-theme='light'] {
  @include var.spread-vars(light);
}

:root[data-theme='dark'] {
  @include var.spread-vars(dark);
}

html,
body {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 0;
  margin: 0;
  height: 100%;
  scroll-behavior: smooth;
  background-color: var(--bg-0);
}

h1,
h2,
h3,
h4,
h5,
h6,
label,
p,
a,
a:active,
a:visited {
  color: var(--text-0);
  text-decoration: none;
}

a:hover {
  color: var(--accent);
}

nav,
ul,
li {
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--text-0);
}

h1 {
  font-size: 1.45rem;
}

h2 {
  font-size: 1.05rem;
}

details summary:hover {
  cursor: pointer;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.views-wrapper {
  padding: 0.5rem 1rem;
  width: calc(100% - 2rem);
  max-width: 1024px;
  margin: 0 auto;
}

.app-footer {
  flex-grow: 1;
}

.icons {
  fill: var(--text-0);
}

.hero {
  padding: 1.25rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background-color: var(--bg-1);

  h1 {
    margin: 0;
    text-align: left;
  }

  p {
    margin: 0.5rem 0 0;
    color: var(--text-1);
  }
}
</style>
