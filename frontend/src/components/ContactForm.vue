<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { get_friends_for_board, send_contact_batch_for_friends, send_contact_for_friend } from '../api/friends'
import type { BoardFriend, ContactRecording, ContactWriteData } from '../api/friends'
import { ApiError } from '../api/http'
import { CONTACT_OPTIONS } from '../contact-options'

const props = defineProps<{ friend?: BoardFriend; friends?: BoardFriend[] }>()
const emit = defineEmits<{ cancel: []; recorded: [recording: ContactRecording] }>()
const VALIDATION_ERROR_STATUS = 400
const NOT_FOUND_STATUS = 404
const CONTACT_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
})
const form = ref<HTMLFormElement | null>(null)
const note_input = ref<HTMLTextAreaElement | null>(null)
const friend_picker = ref<HTMLFieldSetElement | null>(null)
const is_picker_open = ref(!props.friend)
const loaded_friends = ref<BoardFriend[] | null>(null)
const is_loading_friends = ref(false)
const has_friends_error = ref(false)
const search = ref('')
const friend_ids = ref(props.friend ? [props.friend.id] : [])
const kind = ref<ContactWriteData['kind']>(CONTACT_OPTIONS.message.value)
const note = ref('')
const contact_date = ref(get_today_for_contact())
const is_saving = ref(false)
const error_message = ref('')
const invalid_field = ref<string | null>(null)
const needs_friends_refresh = ref(false)
const available_friends = computed(() => loaded_friends.value ?? props.friends ?? [])
const matching_friends = computed(() => {
  const query = get_search_text_for_picker(search.value.trim())
  return available_friends.value.filter((friend) => get_search_text_for_picker(friend.name).includes(query))
    .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR', { sensitivity: 'base' }))
})
const selection_label = computed(() => {
  const count = friend_ids.value.length
  if (count === 0) return 'Nenhum amigo selecionado'
  return count === 1 ? '1 amigo selecionado' : `${count} amigos selecionados`
})

/** Match names even when the search leaves off an accent. */
function get_search_text_for_picker(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR')
}

/** Use the board's São Paulo calendar day regardless of the browser's time zone. */
function get_today_for_contact(): string {
  const parts = CONTACT_DATE_FORMAT.formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function focus_note_for_contact(): void {
  note_input.value?.focus()
}

function has_note_for_contact(): boolean {
  return note.value.trim().length > 0
}

async function get_friends_for_picker(): Promise<void> {
  if (is_loading_friends.value) return
  is_loading_friends.value = true
  has_friends_error.value = false
  try {
    loaded_friends.value = await get_friends_for_board()
  } catch {
    has_friends_error.value = true
  } finally {
    is_loading_friends.value = false
  }
}

async function open_friend_picker(): Promise<void> {
  is_picker_open.value = true
  if (!props.friends) void get_friends_for_picker()
  await nextTick()
  friend_picker.value?.focus()
}

async function refresh_friends_for_picker(): Promise<void> {
  await get_friends_for_picker()
  if (has_friends_error.value) return
  const available_ids = new Set(available_friends.value.map(({ id }) => id))
  if (props.friend && !available_ids.has(props.friend.id)) {
    error_message.value = 'O amigo deste registro não está mais disponível. Sua nota continua aqui para você copiar antes de fechar.'
    return
  }
  friend_ids.value = friend_ids.value.filter((id) => available_ids.has(id))
  search.value = ''
  needs_friends_refresh.value = false
  error_message.value = ''
  friend_picker.value?.focus()
}

/** Save once and preserve the selected friends and draft while the owner retries. */
async function send_contact_for_form(): Promise<void> {
  const first_friend_id = friend_ids.value[0]
  if (is_saving.value || needs_friends_refresh.value || !first_friend_id) return
  const is_batch = friend_ids.value.length > 1
  is_saving.value = true
  error_message.value = ''
  invalid_field.value = null
  const details = { kind: kind.value, note: note.value, date: contact_date.value }
  try {
    const recording = is_batch
      ? await send_contact_batch_for_friends(friend_ids.value, details)
      : { batch_id: null, contacts: [await send_contact_for_friend(first_friend_id, details)] }
    emit('recorded', recording)
    if (!props.friend) {
      friend_ids.value = []
      search.value = ''
      kind.value = CONTACT_OPTIONS.message.value
      note.value = ''
      contact_date.value = get_today_for_contact()
    }
  } catch (error) {
    invalid_field.value = error instanceof ApiError ? error.field : null
    if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) {
      needs_friends_refresh.value = is_picker_open.value
      error_message.value = is_picker_open.value
        ? 'Um dos amigos selecionados não está mais disponível. Atualize a lista e confira quem ficou marcado.'
        : 'Este amigo não está mais disponível. Sua nota continua aqui. Atualize os dados deste amigo antes de registrar.'
    } else if (error instanceof ApiError && error.status === VALIDATION_ERROR_STATUS) {
      error_message.value = `${error.message} Sua nota continua aqui. Tente novamente após revisar os campos.`
    } else {
      error_message.value = 'Não conseguimos confirmar o registro. Sua nota continua aqui. Verifique sua conexão e tente novamente.'
    }
  } finally {
    is_saving.value = false
  }
}

defineExpose({ focus_note_for_contact, has_note_for_contact, is_saving })
onMounted(() => {
  if (is_picker_open.value) void get_friends_for_picker()
})
</script>

<template>
  <form ref="form" class="contact-form" @submit.prevent="send_contact_for_form" @keydown.ctrl.enter.prevent="form?.requestSubmit()" @keydown.meta.enter.prevent="form?.requestSubmit()">
    <fieldset v-if="is_picker_open" ref="friend_picker" class="friend-picker" tabindex="-1" :disabled="is_saving" aria-describedby="contact-participant-count">
      <legend class="note-label">Com quem você falou?</legend>
      <label class="sr-only" for="contact-friend-search">Buscar amigos por nome</label>
      <input id="contact-friend-search" v-model="search" class="field" type="search"
        placeholder="Buscar por nome" :disabled="is_loading_friends || has_friends_error" @keydown.enter.prevent>
      <p v-if="is_loading_friends" class="picker-status" role="status">Carregando amigos…</p>
      <div v-else-if="has_friends_error" class="picker-status" role="alert">
        <p>Não conseguimos carregar seus amigos. Verifique sua conexão e tente novamente.</p>
        <button type="button" class="stamp" @click="get_friends_for_picker">Tentar novamente</button>
      </div>
      <p v-else-if="available_friends.length === 0" class="picker-status">
        Seu caderno ainda não tem amigos. <RouterLink to="/amigos/novo">Adicionar amigo</RouterLink>
      </p>
      <p v-else-if="matching_friends.length === 0" class="picker-status" role="status">
        Nenhum amigo com esse nome.
      </p>
      <ul v-else class="friend-options" aria-label="Amigos">
        <li v-for="candidate in matching_friends" :key="candidate.id">
          <label class="friend-option">
            <input v-model="friend_ids" type="checkbox" :value="candidate.id" :disabled="candidate.id === friend?.id">
            <span>{{ candidate.name }}</span>
          </label>
        </li>
      </ul>
      <p id="contact-participant-count" class="picker-status" role="status">{{ selection_label }}</p>
    </fieldset>
    <button v-else type="button" class="stamp add-participants" :disabled="is_saving" @click="open_friend_picker">
      adicionar mais amigos
    </button>
    <fieldset class="contact-details" :disabled="is_saving" :aria-describedby="invalid_field === 'kind' ? 'contact-error' : undefined">
      <legend class="sr-only">Tipo de contato</legend>
      <div class="contact-options">
        <label v-for="option in CONTACT_OPTIONS" :key="option.value" class="contact-option" :class="{ selected: kind === option.value }">
          <input v-model="kind" type="radio" name="kind" :value="option.value" :aria-invalid="invalid_field === 'kind' ? true : undefined">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="option.icon" /></svg>
          <span>{{ option.label }}</span>
        </label>
      </div>
      <label for="contact-date" class="note-label">Dia do contato</label>
      <input id="contact-date" v-model="contact_date" class="field contact-date" name="date" type="date" required :max="get_today_for_contact()"
        :aria-invalid="invalid_field === 'date' ? true : undefined"
        :aria-describedby="invalid_field === 'date' ? 'contact-error' : undefined">
      <label for="contact-note" class="note-label">Nota rápida <span>(opcional)</span></label>
      <textarea id="contact-note" ref="note_input" v-model="note" class="field" rows="3" placeholder="O que ficou da conversa?" :aria-invalid="invalid_field === 'note' ? true : undefined" :aria-describedby="invalid_field === 'note' ? 'contact-error' : undefined"></textarea>
    </fieldset>
    <p v-if="friend" class="keyboard-hint">Ctrl + Enter registra · Esc fecha</p>
    <p v-if="error_message" id="contact-error" class="contact-error" role="alert">{{ error_message }}</p>
    <button v-if="needs_friends_refresh" type="button" class="stamp refresh-friends" :disabled="is_loading_friends"
      @click="refresh_friends_for_picker">Atualizar lista de amigos</button>
    <div class="sheet-actions" :class="{ 'page-actions': !friend }">
      <button v-if="friend" type="button" class="secondary-button" :disabled="is_saving" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="primary-button" :disabled="is_saving || needs_friends_refresh || friend_ids.length === 0" :aria-busy="is_saving">
        <span v-if="is_saving" class="saving-spinner" aria-hidden="true"></span>{{ is_saving ? 'Registrando…' : 'Registrar' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.contact-form { line-height: 1.5; }
fieldset { min-width: 0; margin: 16px 0 0; padding: 0; border: 0; }
.contact-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.contact-option { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; box-sizing: border-box; min-height: 56px; border: 1.5px solid var(--ink); border-radius: var(--radius-sm); background: var(--sheet); font-size: .875rem; cursor: pointer; }
.contact-option.selected { border: 2px solid var(--primary); background: var(--primary-50); color: var(--primary-800); }
.contact-option:hover { background: var(--primary-50); }
.contact-option:focus-within { box-shadow: var(--focus-ring); }
.contact-option input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: inherit; }
.note-label { display: block; margin-top: 16px; font-size: .875rem; font-weight: 500; }
.note-label span { color: var(--neutral-600); font-weight: 400; }
.contact-date { box-sizing: border-box; width: 100%; min-width: 0; margin-top: 8px; }
textarea.field { box-sizing: border-box; height: auto; min-height: 80px; max-height: 35dvh; margin-top: 8px; padding: 12px 16px; resize: vertical; caret-color: var(--pen-ink); }
textarea.field::placeholder { color: var(--neutral-600); }
.keyboard-hint { display: none; margin: 8px 0 0; color: var(--neutral-600); font-size: .75rem; }
.contact-error { margin: 16px 0 0; padding: 12px; border: 1.5px solid var(--error); border-radius: var(--radius-sm); background: var(--error-50); color: var(--error); font-size: .875rem; }
.sheet-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.sheet-actions button { flex: 1; min-height: 48px; padding: 8px 16px; border: 1.5px solid var(--ink); border-radius: var(--radius-pill); font-weight: 600; }
.secondary-button { background: var(--sheet); color: var(--ink); }
.secondary-button:hover:not(:disabled) { background: var(--neutral-100); }
.sheet-actions .primary-button { display: flex; align-items: center; justify-content: center; gap: 8px; border-color: var(--primary); background: var(--primary); color: #fff; }
.primary-button:hover:not(:disabled) { background: var(--primary-hover); }
.primary-button:active:not(:disabled) { background: var(--primary-pressed); }
.friend-picker { margin-top: 8px; }
.friend-picker .note-label { margin: 0 0 6px; }
.friend-picker input[type="search"] { box-sizing: border-box; width: 100%; }
.friend-options { max-height: 140px; overflow-y: auto; overscroll-behavior-y: contain; margin: 4px 0 0; padding: 0; list-style: none; }
.friend-option { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 4px 8px; border-bottom: 1px solid var(--ruling); cursor: pointer; }
.friend-option:has(input:checked), .friend-option:hover { background: var(--primary-50); }
.friend-option:focus-within { outline: 2px solid var(--primary); outline-offset: -2px; }
.friend-option input { width: 18px; height: 18px; margin: 0; flex: none; accent-color: var(--primary-700); }
.friend-option span { overflow-wrap: anywhere; }
.picker-status { margin: 4px 0 0; color: var(--neutral-700); font-size: .875rem; }
.picker-status a { color: var(--primary-800); }
.picker-status .stamp { min-height: 44px; }
.add-participants, .refresh-friends { min-height: 44px; margin-top: 4px; }
button { cursor: pointer; }
button:disabled { opacity: .55; cursor: default; }
svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.saving-spinner { width: 16px; height: 16px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: saving-spin 1s linear infinite; }
@keyframes saving-spin { to { transform: rotate(360deg); } }
@media (min-width: 1024px) {
  .keyboard-hint { display: block; }
  .contact-option { min-height: 80px; }
  textarea.field { min-height: 104px; }
}
@media (max-width: 1023px) {
  .page-actions { position: sticky; bottom: 0; padding: 8px 0; background: var(--sheet); }
}
@media (prefers-reduced-motion: reduce) { .saving-spinner { animation: none; } }
</style>
