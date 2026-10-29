<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { get_contacts_for_friend } from '../api/friends'
import type { BoardFriend, FriendContact } from '../api/friends'
import { CONTACT_OPTIONS } from '../contact-options'

const props = defineProps<{ friend: BoardFriend; newest_contact: FriendContact | null }>()
const HISTORY_SKELETON_COUNT = 4
const HISTORY_TIME_ZONE = 'America/Sao_Paulo'
const HISTORY_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const HISTORY_DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: HISTORY_TIME_ZONE, day: '2-digit', month: 'numeric', year: 'numeric',
})
const HISTORY_FULL_DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: HISTORY_TIME_ZONE, dateStyle: 'full', timeStyle: 'short',
})
const contacts = ref<FriendContact[]>([])
const next_cursor = ref<string | null>(null)
const is_loading = ref(true)
const is_loading_more = ref(false)
const has_error = ref(false)
const has_loaded_first_page = ref(false)
const has_loaded_more = ref(false)
const announcement = ref('')
const history_list = ref<HTMLOListElement | null>(null)
const retry_button = ref<HTMLButtonElement | null>(null)
const highlighted_contact_id = ref<string | null>(null)
let request_version = 0

const displayed_contacts = computed(() => contacts.value.map((contact) => ({
  ...contact,
  option: CONTACT_OPTIONS[contact.kind],
  short_date: get_date_for_history(contact.date),
  full_date: HISTORY_FULL_DATE_FORMAT.format(new Date(contact.date)),
})))

/** Read both years in São Paulo so midnight in another zone cannot change the label. */
function get_date_for_history(date: string): string {
  const parts = HISTORY_DATE_FORMAT.formatToParts(new Date(date))
  const day = parts.find((part) => part.type === 'day')?.value
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const year = parts.find((part) => part.type === 'year')?.value
  const current_year = HISTORY_DATE_FORMAT.formatToParts(new Date()).find((part) => part.type === 'year')?.value
  return `${day}/${HISTORY_MONTHS[month - 1]}${year === current_year ? '' : `/${year}`}`
}

/** Preserve local registrations and discard repeated IDs when an older page arrives. */
async function get_contacts_for_history(): Promise<void> {
  if (is_loading_more.value) return
  const is_first_page = !has_loaded_first_page.value
  const cursor = is_first_page ? null : next_cursor.value
  if (!is_first_page && cursor === null) return
  const current_request_version = ++request_version
  is_loading.value = is_first_page
  is_loading_more.value = !is_first_page
  has_error.value = false
  try {
    const page = await get_contacts_for_friend(props.friend.id, cursor)
    if (current_request_version !== request_version) return
    const known_ids = new Set(contacts.value.map((contact) => contact.id))
    const added_contacts = page.results.filter((contact) => {
      if (known_ids.has(contact.id)) return false
      known_ids.add(contact.id)
      return true
    })
    contacts.value.push(...added_contacts)
    next_cursor.value = page.next
    has_loaded_first_page.value = true
    if (!is_first_page) {
      has_loaded_more.value = true
      const count = added_contacts.length
      announcement.value = `Mais ${count} ${count === 1 ? 'contato carregado.' : 'contatos carregados.'}${page.next === null ? ' Esse é o primeiro contato.' : ''}`
      await nextTick()
      if (current_request_version !== request_version) return
      const first_added_id = added_contacts[0]?.id
      const first_added_item = Array.from(history_list.value?.children ?? [])
        .find((item) => item.getAttribute('data-contact-id') === first_added_id)
      if (first_added_item instanceof HTMLElement) first_added_item.focus()
    }
  } catch {
    if (current_request_version !== request_version) return
    has_error.value = true
    if (!is_first_page) {
      await nextTick()
      if (current_request_version === request_version) retry_button.value?.focus()
    }
  } finally {
    if (current_request_version === request_version) {
      is_loading.value = false
      is_loading_more.value = false
    }
  }
}

watch(() => props.newest_contact, (contact) => {
  if (!contact) return
  contacts.value = [contact, ...contacts.value.filter((existing) => existing.id !== contact.id)]
  highlighted_contact_id.value = contact.id
}, { immediate: true })

onMounted(get_contacts_for_history)
// History belongs to this mounted profile; revisiting fetches changes such as board undo.
onBeforeUnmount(() => { request_version += 1 })
</script>

<template>
  <section class="friend-history" :aria-labelledby="`history-title-${friend.id}`" :aria-busy="is_loading">
    <h2 :id="`history-title-${friend.id}`" class="history-title">Histórico</h2>
    <p class="sr-only" role="status">{{ is_loading ? 'Carregando o histórico…' : announcement }}</p>
    <ol v-if="is_loading" class="history-skeleton" aria-hidden="true">
      <li v-for="skeleton in HISTORY_SKELETON_COUNT" :key="skeleton">
        <span class="skeleton-bar skeleton-date"></span>
        <span class="skeleton-bar skeleton-note" :class="{ 'skeleton-long': skeleton === 2 }"></span>
      </li>
    </ol>
    <ol v-else-if="contacts.length" ref="history_list" class="history-list" :aria-label="`Contatos com ${friend.name}, do mais recente ao mais antigo`">
      <li v-for="contact in displayed_contacts" :key="contact.id" class="history-item" :class="{ 'history-item--new': contact.id === highlighted_contact_id }"
        :data-contact-id="contact.id" tabindex="-1" @animationend.self="highlighted_contact_id = null">
        <p class="history-meta">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="contact.option.icon" /></svg>
          <time :datetime="contact.date" :title="contact.full_date">{{ contact.short_date }}</time>
          <span class="history-kind">{{ contact.option.label.toLocaleLowerCase('pt-BR') }}</span>
        </p>
        <p v-if="contact.note" class="history-note handwritten-note">{{ contact.note }}</p>
        <p v-else class="history-no-note">sem nota</p>
      </li>
    </ol>
    <template v-else-if="!has_error">
      <p class="history-empty handwritten-note">nenhum contato ainda. que tal registrar o primeiro?</p>
      <p class="history-empty-hint">É só usar o carimbo “registrar contato”, aqui em cima.</p>
    </template>
    <div v-if="has_error" class="history-error">
      <p class="field-error" role="alert"><span aria-hidden="true">!</span>{{ !has_loaded_first_page ? 'Não deu pra abrir o histórico agora.' : 'Não deu pra trazer os mais antigos.' }}</p>
      <p class="history-footer"><button ref="retry_button" type="button" class="stamp stamp-quiet" @click="get_contacts_for_history">Tentar novamente</button></p>
    </div>
    <p v-else-if="!is_loading && next_cursor !== null" class="history-footer">
      <button type="button" class="stamp stamp-quiet" :aria-busy="is_loading_more" :aria-disabled="is_loading_more" @click="get_contacts_for_history">{{ is_loading_more ? 'carregando…' : 'ver mais antigos' }}</button>
    </p>
    <p v-else-if="!is_loading && has_loaded_more && contacts.length" class="history-end">é isso, esse foi o primeiro contato.</p>
  </section>
</template>

<style scoped>
.friend-history { margin-top: var(--notebook-line); container-type: inline-size; }
.history-title { margin: 0; font: 600 1.1875rem/var(--notebook-line) var(--font-title); }
.history-list, .history-skeleton { margin: 0; padding: 0; list-style: none; }
.history-item { position: relative; isolation: isolate; display: grid; align-items: start; grid-template-columns: 7rem minmax(0, 1fr); column-gap: 16px; outline: none; }
.history-item::before { content: ''; position: absolute; z-index: -1; inset: var(--ruling-offset) -8px calc(var(--ruling-offset) * -1); border-radius: 4px; pointer-events: none; }
.history-item:focus { box-shadow: none; }
.history-item:focus::before { box-shadow: var(--focus-ring); }
.history-meta { display: flex; flex-wrap: wrap; align-items: center; align-content: flex-start; column-gap: 4px; margin: 0; min-height: var(--notebook-line); font: 600 .875rem/var(--notebook-line) var(--font-ui); color: var(--primary-700); }
.history-meta > * { white-space: nowrap; }
.history-meta svg { flex: none; width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.history-kind { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.history-note { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.history-no-note { margin: 0; font: italic 400 .875rem/var(--notebook-line) var(--font-ui); color: var(--neutral-600); }
.history-footer { display: flex; flex-wrap: wrap; align-items: center; gap: 0 16px; margin: 0; min-height: var(--notebook-line); }
.history-end, .history-empty-hint { margin: 0; font: 400 .875rem/var(--notebook-line) var(--font-ui); color: var(--neutral-600); }
.history-empty { margin: 0; }
.field-error { display: flex; gap: .375rem; margin: 0; font: 400 .875rem/var(--notebook-line) var(--font-ui); color: var(--error); }
.stamp-quiet { position: relative; border-color: var(--neutral-700); color: var(--neutral-700); }
.stamp-quiet:hover { background: var(--neutral-100); border-color: var(--ink); color: var(--ink); }
.stamp-quiet::after { content: ''; position: absolute; inset: -8px -4px; }
.stamp-quiet[aria-busy='true'] { opacity: .6; cursor: wait; }
.history-skeleton li { display: grid; grid-template-columns: 7rem minmax(0, 1fr); column-gap: 16px; }
.skeleton-bar { display: block; height: var(--notebook-line); background: linear-gradient(var(--paper), var(--paper)) no-repeat 0 10px/100% 12px; border-radius: 6px; animation: history-pulse 1.2s ease-in-out infinite alternate; }
.skeleton-date { width: 5rem; }
.skeleton-note { width: 84%; }
.skeleton-long { height: calc(var(--notebook-line) * 2); background: repeating-linear-gradient(to bottom, transparent 0 10px, var(--paper) 10px 22px, transparent 22px var(--notebook-line)); }
.history-item--new::before { background-image: repeating-linear-gradient(to bottom, transparent 0 calc(var(--notebook-line) - 1px), var(--ruling) calc(var(--notebook-line) - 1px) var(--notebook-line)); animation: history-fresh 1.2s var(--ease-out) forwards; }
@keyframes history-pulse { from { opacity: 1; } to { opacity: .5; } }
@keyframes history-fresh { from, 70% { background-color: var(--highlight-50); } to { background-color: transparent; } }
@media (prefers-reduced-motion: reduce) { .history-item--new::before, .skeleton-bar { animation: none; } }
@container (max-width: 24rem) {
  .history-item, .history-skeleton li { grid-template-columns: minmax(0, 1fr); }
  .history-kind { position: static; width: auto; height: auto; overflow: visible; clip-path: none; font-weight: 400; color: var(--neutral-600); }
  .history-kind::before { content: '· '; }
}
</style>
