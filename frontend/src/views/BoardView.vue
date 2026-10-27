<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { get_friends_for_board } from '../api/friends'
import type { BoardFriend } from '../api/friends'
import BoardFriendCard from '../components/BoardFriendCard.vue'

const emit = defineEmits<{ 'open-contact-sheet': [friend: BoardFriend] }>()
const SKELETONS_PER_COLUMN = 2

const BOARD_COLUMNS = [
  { value: 'overdue', label: 'Faz um tempinho', empty: 'ninguém por aqui. aproveite o dia.' },
  { value: 'this_week', label: 'Essa semana', empty: 'nada chegando nos próximos dias.' },
  { value: 'on_track', label: 'Em dia', empty: 'ainda ninguém. um contato já muda isso.' },
  { value: 'just_talked', label: 'Falei agora', empty: 'ninguém hoje ainda.' },
] as const

const friends = ref<BoardFriend[]>([])
const is_loading = ref(true)
const has_error = ref(false)
const columns = computed(() => BOARD_COLUMNS.map((column) => ({
  ...column,
  friends: friends.value.filter((friend) => friend.column === column.value),
})))

async function get_friends_for_view(): Promise<void> {
  is_loading.value = true
  has_error.value = false
  try {
    friends.value = await get_friends_for_board()
  } catch {
    has_error.value = true
  } finally {
    is_loading.value = false
  }
}

onMounted(get_friends_for_view)
</script>

<template>
  <div class="board-view">
    <h1 class="view-title">Quadro</h1>
    <div v-if="is_loading" role="status" aria-busy="true">
      <span class="sr-only">Carregando seu quadro…</span>
      <div class="board-columns" aria-hidden="true">
        <div v-for="column in BOARD_COLUMNS" :key="column.value">
          <p class="skeleton-label">{{ column.label }}</p>
          <div class="skeleton-description"></div>
          <div class="friend-list">
            <div v-for="index in SKELETONS_PER_COLUMN" :key="index" class="board-skeleton"></div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="has_error" role="alert">
      <p>Não conseguimos abrir seu caderno agora. Tente de novo.</p>
      <button type="button" class="stamp" @click="get_friends_for_view">Tentar de novo</button>
    </div>
    <div v-else-if="friends.length === 0">
      <p class="handwritten-note">Seu quadro está em branco.</p>
      <RouterLink to="/amigos/novo" class="stamp">adicionar primeiro amigo</RouterLink>
    </div>
    <div v-else class="board-columns">
      <section v-for="column in columns" :key="column.value" :aria-labelledby="`column-${column.value}`">
        <h2 :id="`column-${column.value}`">{{ column.label }}</h2>
        <ul v-if="column.friends.length" class="friend-list">
          <BoardFriendCard v-for="friend in column.friends" :key="friend.id" :friend="friend" @open-contact-sheet="emit('open-contact-sheet', $event)" />
        </ul>
        <p v-else class="handwritten-note">{{ column.empty }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.board-columns { display: grid; gap: var(--notebook-line); margin-top: var(--notebook-line); }
h2, .skeleton-label { margin: 0; font: 600 1.1875rem/var(--notebook-line) var(--font-title); }
.friend-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--notebook-line) 14px; margin: 0; padding: 0; list-style: none; }
.board-skeleton { height: calc(var(--notebook-line) * 6); }
.board-skeleton, .skeleton-description { border-radius: 4px; background: var(--neutral-100); animation: board-pulse 1.2s ease-in-out infinite; }
.skeleton-description { width: 60%; height: 12px; margin: 10px 0; }
@keyframes board-pulse { 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .board-skeleton, .skeleton-description { animation: none; } }
</style>
