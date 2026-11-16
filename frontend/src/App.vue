<script setup lang="ts">
import { useRoute } from 'vue-router'
import { auth_state } from './auth'
import SheetHeader from './components/SheetHeader.vue'

const route = useRoute()
</script>

<template>
  <RouterView v-if="route.name === 'login'" />
  <main v-else class="desk scene">
    <div class="book" :class="{ 'profile-open': route.name === 'friend-detail', 'board-open': route.name === 'board' }">
      <div class="spiral-top spiral-h" aria-hidden="true"></div>

      <section class="page page-left margin-line">
        <div class="page-content paper-lined">
          <SheetHeader />
          <p v-if="auth_state.error" class="session-error" role="alert">{{ auth_state.error }}</p>
          <RouterView />
        </div>
      </section>

      <div class="spiral-center spiral-v" aria-hidden="true"></div>

      <section v-if="route.name !== 'board'" class="page page-right margin-line" :aria-label="route.name === 'new-friend' ? 'Rascunho do novo amigo' : route.name === 'import-friends' ? 'Prévia da importação' : 'Perfil'">
        <div class="page-content paper-lined">
          <SheetHeader />
          <RouterView name="detail" v-slot="{ Component }">
            <component :is="Component" v-if="Component" />
          </RouterView>
        </div>
      </section>

      <nav class="tabs" aria-label="Seções">
        <RouterLink
          to="/quadro"
          class="tab tab-board"
          :aria-current="route.name === 'board' ? 'page' : undefined"
        >quadro</RouterLink>
        <RouterLink
          to="/amigos"
          class="tab tab-friends"
          :aria-current="['friends', 'friend-detail', 'new-friend', 'import-friends'].includes(String(route.name)) ? 'page' : undefined"
        >amigos</RouterLink>
        <RouterLink
          to="/config"
          class="tab tab-config"
          :aria-current="route.name === 'config' ? 'page' : undefined"
        >config</RouterLink>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.session-error { color: var(--error); }
/* A viewport-sized gradient becomes a huge raster over 5,000 virtual rows. Repeat one ruling tile instead. */
.page-content:has(.agenda-import-page) { background-size: 100% var(--notebook-line); }
</style>
