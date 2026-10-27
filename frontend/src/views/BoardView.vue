<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { get_friends_for_board, get_groups_for_board } from '../api/friends'
import type { BoardFriend, FriendGroup } from '../api/friends'
import BoardFriendCard from '../components/BoardFriendCard.vue'
import GroupBadge from '../components/GroupBadge.vue'

const emit = defineEmits<{ 'open-contact-sheet': [friend: BoardFriend] }>()
const SKELETONS_PER_COLUMN = 2
const SUMMARY_NAME_COUNT = 2
const BOARD_COLUMNS = [
  { value: 'overdue', label: 'Faz um tempinho', description: 'o ritmo de cada um já chegou', empty: 'ninguém por aqui. aproveite o dia.', collapsible: false },
  { value: 'this_week', label: 'Essa semana', description: 'o ritmo chega nos próximos dias', empty: 'nada chegando nos próximos dias.', collapsible: false },
  { value: 'on_track', label: 'Em dia', description: 'conversa recente, tudo certo', empty: 'ainda ninguém. um contato já muda isso.', collapsible: true },
  { value: 'just_talked', label: 'Falei agora', description: 'falou hoje ou ontem', empty: 'ninguém hoje ainda.', collapsible: true },
] as const

const friends = ref<BoardFriend[]>([])
const groups = ref<FriendGroup[]>([])
const is_loading = ref(true)
const has_error = ref(false)
const expanded_columns = ref<BoardFriend['column'][]>([])
const has_ungrouped_friends = computed(() => friends.value.some((friend) => friend.groups.length === 0))
const columns = computed(() => BOARD_COLUMNS.map((column) => ({
  ...column,
  friends: friends.value.filter((friend) => friend.column === column.value),
})))

function get_friend_summary_for_column(column_friends: BoardFriend[]): string {
  const names = column_friends.slice(0, SUMMARY_NAME_COUNT).map((friend) => friend.name)
  const remaining_count = column_friends.length - names.length
  return remaining_count > 0 ? `${names.join(', ')} e mais ${remaining_count}` : names.join(' e ')
}

function set_column_expansion_for_board(column: BoardFriend['column']): void {
  expanded_columns.value = expanded_columns.value.includes(column)
    ? expanded_columns.value.filter((value) => value !== column)
    : [...expanded_columns.value, column]
}

async function get_friends_for_view(): Promise<void> {
  is_loading.value = true
  has_error.value = false
  try {
    const [board_friends, board_groups] = await Promise.all([get_friends_for_board(), get_groups_for_board()])
    friends.value = board_friends
    groups.value = board_groups
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
    <header class="board-header">
      <h1 class="view-title">Quadro</h1>
      <p class="board-introduction">As colunas se arrumam sozinhas, pelo último contato e pelo ritmo de cada amigo.</p>
    </header>
    <div v-if="!is_loading && !has_error" class="board-legend" aria-label="Legenda de grupos">
      <p>Seus grupos. O post-it usa a cor do primeiro grupo em ordem alfabética, e todos vêm escritos nele:</p>
      <div class="legend-badges">
        <GroupBadge v-for="group in groups" :key="group.id" :group="group" />
        <GroupBadge v-if="has_ungrouped_friends" :group="{ name: 'sem grupo', color: 'neutral' }" />
      </div>
    </div>
    <div v-if="is_loading" class="board-state" role="status" aria-busy="true">
      <span class="sr-only">Carregando seu quadro…</span>
      <div class="state-columns" aria-hidden="true">
        <div v-for="column in BOARD_COLUMNS" :key="column.value" class="board-column" :data-column="column.value">
          <p class="skeleton-label">{{ column.label }}</p>
          <div class="skeleton-description"></div>
          <div class="friend-list">
            <div v-for="index in SKELETONS_PER_COLUMN" :key="index" class="board-skeleton"></div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="has_error" class="board-state board-error" role="alert">
      <p>Não conseguimos abrir seu caderno agora.</p>
      <p>Verifique sua conexão e tente de novo.</p>
      <button type="button" class="retry-button" @click="get_friends_for_view">Tentar de novo</button>
    </div>
    <template v-else-if="friends.length === 0">
      <div class="board-state board-empty">
        <p class="handwritten-note">Seu quadro está em branco.</p>
        <RouterLink to="/amigos/novo" class="stamp empty-link">adicionar primeiro amigo</RouterLink>
      </div>
      <div class="board-state empty-columns state-columns" aria-hidden="true">
        <div v-for="column in BOARD_COLUMNS" :key="column.value" class="board-column" :data-column="column.value">
          <p class="skeleton-label">{{ column.label }}</p>
          <p class="column-description">{{ column.description }}</p>
          <div class="empty-postit"></div>
        </div>
      </div>
    </template>
    <div v-else class="board-columns">
      <section v-for="column in columns" :key="column.value" class="board-column" :data-column="column.value" :aria-labelledby="`column-${column.value}`">
        <h2 :id="`column-${column.value}`">{{ column.label }}</h2>
        <p class="column-description" :title="column.description">{{ column.description }}</p>
        <button v-if="column.collapsible && column.friends.length" type="button" class="column-toggle" :aria-controls="`friends-${column.value}`" :aria-expanded="expanded_columns.includes(column.value)" @click="set_column_expansion_for_board(column.value)">
          <span>{{ get_friend_summary_for_column(column.friends) }}</span>
          <strong>{{ expanded_columns.includes(column.value) ? 'recolher' : 'mostrar' }}</strong>
        </button>
        <ul v-if="column.friends.length" :id="`friends-${column.value}`" class="friend-list" :class="{ 'mobile-collapsed': column.collapsible && !expanded_columns.includes(column.value) }">
          <BoardFriendCard v-for="friend in column.friends" :key="friend.id" :friend="friend" @open-contact-sheet="emit('open-contact-sheet', $event)" />
        </ul>
        <p v-else class="handwritten-note empty-column-note">{{ column.empty }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.board-header p, .board-legend p, .column-description { margin: 0; }
.board-introduction, .board-legend > p { font-size: .875rem; line-height: var(--notebook-line); }
.board-introduction { color: var(--neutral-700); }
.board-legend { margin-top: var(--notebook-line); min-width: 0; }
.board-legend > p { display: none; color: var(--neutral-600); }
.legend-badges { display: flex; flex-wrap: wrap; column-gap: 8px; }
.legend-badges :deep(.group-badge) { height: 24px; margin: 4px 0; padding: 0 8px; }
.board-columns, .state-columns { display: grid; }
.state-columns { gap: var(--notebook-line); }
.board-column { min-width: 0; margin-top: var(--notebook-line); }
.board-state { margin-top: var(--notebook-line); }
.board-state .board-column { margin-top: 0; }
h2, .skeleton-label { margin: 0; font: 600 1.1875rem/var(--notebook-line) var(--font-title); }
.column-description { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--neutral-600); font-size: .75rem; line-height: var(--notebook-line); }
.friend-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--notebook-line) 14px; margin: 0; padding: 0; list-style: none; }
.mobile-collapsed { display: none; }
.column-toggle { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; min-height: calc(var(--notebook-line) * 2); padding: 0; border: 0; background: transparent; color: var(--neutral-700); text-align: left; font-size: .875rem; cursor: pointer; }
.column-toggle span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.column-toggle strong { color: var(--primary-700); }
.board-empty p { margin: 0; }
.empty-link { margin-top: var(--notebook-line); min-height: 44px; text-decoration: none; }
.empty-columns { display: none; }
.empty-postit { box-sizing: border-box; height: calc(var(--notebook-line) * 6); border: 2px dashed var(--neutral-400); border-radius: 4px; }
.board-error { padding: 16px 24px; border: 2px solid var(--error); border-radius: var(--radius-md); background: var(--error-50); }
.board-error p { margin: 0; line-height: var(--notebook-line); }
.board-error p:first-child { color: var(--error); font-weight: 600; }
.retry-button { min-height: 44px; margin-top: 8px; padding: 0 20px; border: 1.5px solid var(--ink); border-radius: var(--radius-pill); background: var(--sheet); font-weight: 600; cursor: pointer; }
.retry-button:hover { background: var(--neutral-100); }
.retry-button:active { background: var(--neutral-200); }
.empty-column-note { margin: 0; }
.board-skeleton { height: calc(var(--notebook-line) * 6); }
.board-skeleton, .skeleton-description { border-radius: 4px; background: var(--neutral-100); animation: board-pulse 1.2s ease-in-out infinite; }
.skeleton-description { width: 60%; height: 12px; margin: 10px 0; }
@keyframes board-pulse { 50% { opacity: .45; } }
@media (min-width: 1024px) {
  .board-view, .state-columns { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 24px; align-items: start; }
  .board-header { grid-column: 1 / 3; }
  .board-legend { grid-column: 3 / 5; margin-top: 0; }
  .board-legend > p { display: block; }
  .board-columns { display: contents; }
  .board-state { grid-column: 1 / -1; }
  .friend-list, .mobile-collapsed { display: grid; grid-template-columns: minmax(0, 1fr); }
  .column-toggle { display: none; }
  .empty-columns { display: grid; }
}
@media (min-width: 1280px) {
  .board-view, .state-columns { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 112px minmax(0, 1fr) minmax(0, 1fr); }
  .board-legend { grid-column: 4 / 6; }
  .board-column[data-column="on_track"] { grid-column: 4; }
  .board-column[data-column="just_talked"] { grid-column: 5; }
}
@media (prefers-reduced-motion: reduce) { .board-skeleton, .skeleton-description { animation: none; } }
</style>
