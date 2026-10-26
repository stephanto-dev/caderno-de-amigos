<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { auth_state, logout_user_for_browser } from './auth'

const route = useRoute()
const router = useRouter()

async function send_logout_for_browser(): Promise<void> {
  if (await logout_user_for_browser()) await router.replace('/login')
}
</script>

<template>
  <main class="desk scene">
    <div class="book" :class="{ 'profile-open': route.name === 'friend-detail' }">
      <div class="spiral-top spiral-h" aria-hidden="true"></div>

      <section class="page page-left margin-line">
        <div class="page-content paper-lined">
          <div v-if="auth_state.current_user" class="session-controls">
            <span>{{ auth_state.current_user }}</span>
            <button name="logout" type="button" :disabled="auth_state.is_loading" @click="send_logout_for_browser">Sair</button>
          </div>
          <p v-if="auth_state.error && route.name !== 'login'" class="session-error" role="alert">{{ auth_state.error }}</p>
          <RouterView />
        </div>
      </section>

      <div class="spiral-center spiral-v" aria-hidden="true"></div>

      <section class="page page-right margin-line" aria-label="Perfil">
        <div class="page-content paper-lined">
          <RouterView name="detail" v-slot="{ Component }">
            <component :is="Component" v-if="Component" />
            <p v-else class="handwritten-note page-prompt">Esta página é de cada amigo.</p>
          </RouterView>
        </div>
      </section>

      <nav v-if="route.name !== 'login'" class="tabs" aria-label="Seções">
        <RouterLink
          to="/"
          class="tab tab-board"
          :aria-current="route.name === 'board' ? 'page' : undefined"
        >Quadro</RouterLink>
        <RouterLink
          to="/amigos"
          class="tab tab-friends"
          :aria-current="route.name === 'friends' || route.name === 'friend-detail' ? 'page' : undefined"
        >Amigos</RouterLink>
        <RouterLink
          to="/amigos/novo"
          class="tab tab-new"
          :aria-current="route.name === 'new-friend' ? 'page' : undefined"
        >+ novo</RouterLink>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.session-controls { display: flex; justify-content: flex-end; gap: 16px; align-items: center; }
.session-controls button { color: var(--primary); font: inherit; text-decoration: underline; cursor: pointer; }
.session-controls button:disabled { cursor: default; opacity: .5; }
.session-error { color: var(--error); }
</style>
