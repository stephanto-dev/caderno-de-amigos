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

      <section v-if="route.name !== 'board'" class="page page-right margin-line" aria-label="Perfil">
        <div class="page-content paper-lined">
          <SheetHeader />
          <RouterView name="detail" v-slot="{ Component }">
            <component :is="Component" v-if="Component" />
            <p v-else class="handwritten-note page-prompt">Esta página é de cada amigo.</p>
          </RouterView>
        </div>
      </section>

      <nav class="tabs" aria-label="Seções">
        <RouterLink
          to="/quadro"
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
        <!-- CRM-19 asks for five tabs; Bom falar is not implemented yet, so Config follows the three existing routes. -->
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
</style>
