<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { get_friend_for_board, get_friends_for_board, get_groups_for_board, send_contact_deletion_for_friend } from '../api/friends'
import type { BoardFriend, FriendGroup, RecordedContact } from '../api/friends'
import BoardFriendCard from '../components/BoardFriendCard.vue'
import ContactSheet from '../components/ContactSheet.vue'
import GroupBadge from '../components/GroupBadge.vue'
import { ApiError } from '../api/http'

const SKELETONS_PER_COLUMN = 2
const SUMMARY_NAME_COUNT = 2
const CONTACT_TOAST_DURATION_MS = 2400
const NOT_FOUND_STATUS = 404
const BOARD_COLUMNS = [
  { value: 'overdue', label: 'Faz um tempinho', description: 'o ritmo de cada um já chegou', empty: 'ninguém por aqui. aproveite o dia.', collapsible: false },
  { value: 'this_week', label: 'Essa semana', description: 'o ritmo chega nos próximos dias', empty: 'nada chegando nos próximos dias.', collapsible: false },
  { value: 'on_track', label: 'Em dia', description: 'conversa recente, tudo certo', empty: 'ainda ninguém. um contato já muda isso.', collapsible: true },
  { value: 'just_talked', label: 'Falei agora', description: 'falou hoje ou ontem', empty: 'ninguém hoje ainda.', collapsible: true },
] as const

const friends = ref<BoardFriend[]>([])
const board_element = ref<HTMLElement | null>(null)
const selected_friend = ref<BoardFriend | null>(null)
const sheet_friend_to_focus = ref<string | null>(null)
const contact_announcement = ref('')
const toast_element = ref<HTMLElement | null>(null)
const contact_to_undo = ref<RecordedContact | null>(null)
const contact_undo_state = ref<'ready' | 'deleted' | 'missing'>('ready')
const is_undoing = ref(false)
const has_undo_error = ref(false)
let toast_timeout: ReturnType<typeof setTimeout> | undefined
const groups = ref<FriendGroup[]>([])
const is_loading = ref(true)
const has_error = ref(false)
const expanded_columns = ref<BoardFriend['column'][]>([])
const has_ungrouped_friends = computed(() => friends.value.some((friend) => friend.groups.length === 0))
const columns = computed(() => BOARD_COLUMNS.map((column) => ({
  ...column,
  friends: friends.value.filter((friend) => friend.column === column.value),
})))

function open_contact_sheet_for_friend(friend: BoardFriend): void {
  if (is_undoing.value) return
  dismiss_contact_feedback_for_board()
  selected_friend.value = friend
}

/** The card can move between columns, so locate its new button after Vue renders. */
async function focus_friend_for_board(friend_id: string): Promise<void> {
  await nextTick()
  const button = board_element.value?.querySelector<HTMLButtonElement>(`[data-friend-id="${friend_id}"] .contact-button`)
  if (button) button.focus()
  else board_element.value?.querySelector<HTMLElement>('h1')?.focus()
}

function close_contact_sheet_for_board(): void {
  sheet_friend_to_focus.value = selected_friend.value?.id ?? null
  selected_friend.value = null
}

function focus_friend_after_sheet_close(): void {
  if (sheet_friend_to_focus.value) void focus_friend_for_board(sheet_friend_to_focus.value)
}

function set_friend_for_board(updated_friend: BoardFriend): void {
  friends.value = friends.value.map((friend) => friend.id === updated_friend.id ? updated_friend : friend)
  if (!expanded_columns.value.includes(updated_friend.column)) expanded_columns.value.push(updated_friend.column)
}

function set_recorded_contact_for_board(contact: RecordedContact): void {
  set_friend_for_board(contact)
  contact_to_undo.value = contact
  contact_undo_state.value = 'ready'
  has_undo_error.value = false
  contact_announcement.value = 'Contato registrado. Boa conversa!'
  close_contact_sheet_for_board()
  start_contact_feedback_timeout()
}

function stop_contact_feedback_timeout(): void {
  clearTimeout(toast_timeout)
}

function dismiss_contact_feedback_for_board(): void {
  stop_contact_feedback_timeout()
  contact_announcement.value = ''
  contact_to_undo.value = null
  has_undo_error.value = false
}

/** Keep the action available while the owner reads it or an undo request needs retrying. */
function start_contact_feedback_timeout(): void {
  stop_contact_feedback_timeout()
  if (is_undoing.value || has_undo_error.value || toast_element.value?.contains(document.activeElement)) return
  toast_timeout = setTimeout(dismiss_contact_feedback_for_board, CONTACT_TOAST_DURATION_MS)
}

/** Remember successful deletion so a failed refresh can retry without deleting again. */
async function undo_contact_for_board(): Promise<void> {
  const contact = contact_to_undo.value
  if (!contact || is_undoing.value) return
  stop_contact_feedback_timeout()
  is_undoing.value = true
  has_undo_error.value = false
  try {
    if (contact_undo_state.value === 'ready') {
      try {
        await send_contact_deletion_for_friend(contact.id, contact.contact_id)
        contact_undo_state.value = 'deleted'
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== NOT_FOUND_STATUS) throw error
        contact_undo_state.value = 'missing'
      }
    }
    try {
      set_friend_for_board(await get_friend_for_board(contact.id))
      contact_announcement.value = contact_undo_state.value === 'deleted'
        ? 'Contato desfeito.' : 'O contato já não está disponível. Quadro atualizado.'
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== NOT_FOUND_STATUS) throw error
      friends.value = friends.value.filter((friend) => friend.id !== contact.id)
      contact_announcement.value = 'Este amigo não está mais disponível. Quadro atualizado.'
    }
    contact_to_undo.value = null
  } catch {
    has_undo_error.value = true
    contact_announcement.value = contact_undo_state.value === 'ready'
      ? 'Não conseguimos confirmar a exclusão. Verifique sua conexão e tente novamente.'
      : 'O contato já não está disponível. Verifique sua conexão e tente atualizar o Quadro novamente.'
    if (contact_undo_state.value === 'deleted') {
      contact_announcement.value = 'O contato foi apagado, mas o Quadro não atualizou. Verifique sua conexão e tente novamente.'
    }
  } finally {
    is_undoing.value = false
    if (!has_undo_error.value) {
      await focus_friend_for_board(contact.id)
      start_contact_feedback_timeout()
    }
  }
}

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
onBeforeUnmount(stop_contact_feedback_timeout)
</script>

<template>
  <div ref="board_element" class="board-view">
    <header class="board-header">
      <h1 class="view-title" tabindex="-1">Quadro</h1>
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
      <p>Verifique sua conexão e tente novamente.</p>
      <button type="button" class="retry-button" @click="get_friends_for_view">Tentar novamente</button>
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
          <BoardFriendCard v-for="friend in column.friends" :key="friend.id" :friend="friend" :is_contact_disabled="is_undoing" :data-friend-id="friend.id" :class="{ registering: selected_friend?.id === friend.id }" @open-contact-sheet="open_contact_sheet_for_friend" />
        </ul>
        <p v-else class="handwritten-note empty-column-note">{{ column.empty }}</p>
      </section>
    </div>
    <Transition name="contact-panel" @after-leave="focus_friend_after_sheet_close">
      <ContactSheet v-if="selected_friend" :friend="selected_friend" @close="close_contact_sheet_for_board" @recorded="set_recorded_contact_for_board" />
    </Transition>
    <div v-show="contact_announcement" ref="toast_element" class="contact-toast" role="status" aria-atomic="true" @mouseenter="stop_contact_feedback_timeout" @mouseleave="start_contact_feedback_timeout" @focusin="stop_contact_feedback_timeout" @focusout="start_contact_feedback_timeout">
      <svg v-if="!has_undo_error" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
      <span>{{ contact_announcement }}</span>
      <button v-if="contact_to_undo" type="button" name="undo-contact" :disabled="is_undoing" :aria-busy="is_undoing" @click="undo_contact_for_board">{{ is_undoing ? 'Desfazendo…' : has_undo_error ? 'Tentar novamente' : 'Desfazer' }}</button>
    </div>
  </div>
</template>

<style scoped>
.registering { outline: 2px dashed var(--primary); outline-offset: 4px; }
.contact-panel-leave-active { animation: none; transition: transform var(--duration-medium) var(--ease-in), opacity var(--duration-medium); }
.contact-panel-leave-to { opacity: 0; transform: translateY(100%); }
@media (min-width: 1280px) { .contact-panel-leave-to { transform: translateX(24px); } }
.contact-toast { position: fixed; z-index: 20; right: 12px; bottom: 80px; left: 12px; display: flex; align-items: center; justify-content: center; gap: 12px; box-sizing: border-box; width: fit-content; max-width: calc(100vw - 24px); min-height: 48px; margin: 0 auto; padding: 8px 20px; border-radius: var(--radius-pill); background: var(--ink); box-shadow: var(--shadow-paper); color: #fff; font: 400 .875rem/1.5 var(--font-ui); }
.contact-toast svg { flex: none; width: 20px; height: 20px; fill: none; stroke: var(--tab-green); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.contact-toast button { flex: none; min-height: 44px; padding: 0 4px; border: 0; background: transparent; color: #fff; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.contact-toast button:disabled { opacity: .55; cursor: wait; }
.contact-toast button:focus-visible { box-shadow: 0 0 0 2px var(--ink), 0 0 0 4px var(--ruling); }
@media (min-width: 1024px) { .contact-toast { bottom: 24px; } }
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
