<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <main class="desk scene">
    <div class="book" :class="{ 'profile-open': route.name === 'friend-detail' }">
      <div class="spiral-top spiral-h" aria-hidden="true"></div>

      <section class="page page-left margin-line">
        <div class="page-content paper-lined">
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

      <nav class="tabs" aria-label="Seções">
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
