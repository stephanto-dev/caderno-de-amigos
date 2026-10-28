<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { send_contact_for_friend } from '../api/friends'
import type { BoardFriend, ContactWriteData, RecordedContact } from '../api/friends'
import { ApiError } from '../api/http'

const props = defineProps<{ friend: BoardFriend }>()
const emit = defineEmits<{ close: []; recorded: [contact: RecordedContact] }>()
const NOTE_AUTOFOCUS_MIN_WIDTH = 1024
const DISMISS_DRAG_DISTANCE = 80
const VALIDATION_ERROR_STATUS = 400
const NOT_FOUND_STATUS = 404
const CONTACT_OPTIONS: { value: ContactWriteData['kind']; label: string; icon: string }[] = [
  { value: 'message', label: 'Mensagem', icon: 'M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-5 2 2-5a10 10 0 0 1-1-4 9 9 0 0 1 17-1Z' },
  { value: 'call', label: 'Ligação', icon: 'm7 3 3 5-3 3a15 15 0 0 0 6 6l3-3 5 3v3a2 2 0 0 1-2 2A19 19 0 0 1 2 5a2 2 0 0 1 2-2Z' },
  { value: 'meeting', label: 'Encontro', icon: 'M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 8h2a3 3 0 0 1 0 6h-2M7 2v3M12 2v3M2 22h18' },
]
const dialog = ref<HTMLDialogElement | null>(null)
const note_input = ref<HTMLTextAreaElement | null>(null)
const keep_note_button = ref<HTMLButtonElement | null>(null)
const kind = ref<ContactWriteData['kind']>(CONTACT_OPTIONS[0].value)
const note = ref('')
const is_saving = ref(false)
const is_confirming_discard = ref(false)
const error_message = ref('')
const invalid_field = ref<string | null>(null)
let drag_start_y = 0

/** Keep unsaved text until the owner explicitly discards it; wait for pending writes. */
async function request_sheet_close(): Promise<void> {
  if (is_saving.value) return
  if (note.value.trim()) {
    is_confirming_discard.value = true
    await nextTick()
    keep_note_button.value?.focus()
    return
  }
  emit('close')
}

function request_sheet_close_from_backdrop(event: MouseEvent): void {
  const bounds = dialog.value?.getBoundingClientRect()
  if (bounds && (event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
    void request_sheet_close()
  }
}

function request_sheet_close_from_drag(event: PointerEvent): void {
  if (event.clientY - drag_start_y >= DISMISS_DRAG_DISTANCE) void request_sheet_close()
}

async function keep_note_for_contact(): Promise<void> {
  is_confirming_discard.value = false
  await nextTick()
  note_input.value?.focus()
}

/** Send once, preserve the draft on failure, and let the calling view apply Django's result. */
async function send_contact_for_sheet(): Promise<void> {
  if (is_saving.value || is_confirming_discard.value) return
  is_saving.value = true
  error_message.value = ''
  invalid_field.value = null
  try {
    const contact = await send_contact_for_friend(props.friend.id, { kind: kind.value, note: note.value })
    emit('recorded', contact)
  } catch (error) {
    invalid_field.value = error instanceof ApiError ? error.field : null
    if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) {
      error_message.value = 'Este amigo não está mais disponível. Sua nota continua aqui. Atualize os dados deste amigo antes de registrar.'
    } else if (error instanceof ApiError && error.status === VALIDATION_ERROR_STATUS) {
      error_message.value = `${error.message} Sua nota continua aqui. Tente novamente após revisar os campos.`
    } else {
      error_message.value = 'Não conseguimos confirmar o registro. Sua nota continua aqui. Verifique sua conexão e os dados deste amigo antes de tentar novamente.'
    }
  } finally {
    is_saving.value = false
  }
}

onMounted(() => {
  dialog.value?.showModal()
  if (window.innerWidth >= NOTE_AUTOFOCUS_MIN_WIDTH) note_input.value?.focus()
})
</script>

<template>
  <dialog ref="dialog" class="contact-sheet paper-surface" aria-labelledby="contact-sheet-title" @cancel.prevent="request_sheet_close" @click.self="request_sheet_close_from_backdrop">
    <div class="sheet-grip" aria-hidden="true" @pointerdown="drag_start_y = $event.clientY; ($event.currentTarget as HTMLElement).setPointerCapture($event.pointerId)" @pointerup="request_sheet_close_from_drag"><span></span></div>
    <header class="sheet-heading">
      <h2 id="contact-sheet-title">Falei com {{ friend.name }}</h2>
      <button type="button" class="close-button" aria-label="Fechar" :disabled="is_saving" @click="request_sheet_close">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </header>
    <div v-if="is_confirming_discard" class="discard-confirmation">
      <p>Descartar nota?</p>
      <p>Ela ainda não foi salva.</p>
      <div class="sheet-actions">
        <button ref="keep_note_button" type="button" name="keep-note" class="secondary-button" @click="keep_note_for_contact">Continuar escrevendo</button>
        <button type="button" name="discard-note" class="primary-button" @click="emit('close')">Descartar nota</button>
      </div>
    </div>
    <form v-else @submit.prevent="send_contact_for_sheet" @keydown.ctrl.enter.prevent="send_contact_for_sheet" @keydown.meta.enter.prevent="send_contact_for_sheet">
      <fieldset :disabled="is_saving" :aria-describedby="invalid_field === 'kind' ? 'contact-error' : undefined">
        <legend class="sr-only">Tipo de contato</legend>
        <div class="contact-options">
          <label v-for="option in CONTACT_OPTIONS" :key="option.value" class="contact-option" :class="{ selected: kind === option.value }">
            <input v-model="kind" type="radio" name="kind" :value="option.value" :aria-invalid="invalid_field === 'kind' ? true : undefined">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="option.icon" /></svg>
            <span>{{ option.label }}</span>
          </label>
        </div>
        <label for="contact-note" class="note-label">Nota rápida <span>(opcional)</span></label>
        <textarea id="contact-note" ref="note_input" v-model="note" class="field" rows="3" placeholder="O que ficou da conversa?" :aria-invalid="invalid_field === 'note' ? true : undefined" :aria-describedby="invalid_field === 'note' ? 'contact-error' : undefined"></textarea>
      </fieldset>
      <p class="keyboard-hint">Ctrl + Enter registra · Esc fecha</p>
      <p v-if="error_message" id="contact-error" class="contact-error" role="alert">{{ error_message }}</p>
      <div class="sheet-actions">
        <button type="button" class="secondary-button" :disabled="is_saving" @click="request_sheet_close">Cancelar</button>
        <button type="submit" class="primary-button" :disabled="is_saving" :aria-busy="is_saving">
          <span v-if="is_saving" class="saving-spinner" aria-hidden="true"></span>{{ is_saving ? 'Registrando…' : 'Registrar' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.contact-sheet { position: fixed; inset: auto 0 0; box-sizing: border-box; width: 100%; max-width: 560px; max-height: 90dvh; margin: 0 auto; padding: 0 24px max(32px, env(safe-area-inset-bottom)); overflow-y: auto; border-bottom: 0; border-radius: 16px 16px 0 0; color: var(--ink); font: 400 1rem/1.5 var(--font-ui); animation: sheet-enter var(--duration-slow) var(--ease-out); }
.contact-sheet::backdrop { background: rgb(43 36 32 / 45%); }
.sheet-grip { display: grid; place-items: center; height: 24px; touch-action: none; }
.sheet-grip span { width: 40px; height: 4px; border-radius: var(--radius-pill); background: var(--neutral-500); }
.sheet-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
h2 { min-width: 0; margin: 0; overflow-wrap: anywhere; font: 600 1.375rem/1.5 var(--font-ui); }
button { cursor: pointer; }
button:disabled { opacity: .55; cursor: wait; }
.close-button { display: grid; flex: none; place-items: center; width: 44px; height: 44px; margin-right: -8px; border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--neutral-700); }
.close-button:hover:not(:disabled) { background: var(--neutral-300); }
svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
fieldset { min-width: 0; margin: 16px 0 0; padding: 0; border: 0; }
.contact-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.contact-option { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; box-sizing: border-box; min-height: 80px; border: 1.5px solid var(--ink); border-radius: var(--radius-sm); background: var(--sheet); font-size: .875rem; cursor: pointer; }
.contact-option.selected { border: 2px solid var(--primary); background: var(--primary-50); color: var(--primary-800); }
.contact-option:hover { background: var(--primary-50); }
.contact-option:focus-within { box-shadow: var(--focus-ring); }
.contact-option input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: inherit; }
.note-label { display: block; margin-top: 16px; font-size: .875rem; font-weight: 500; }
.note-label span { color: var(--neutral-600); font-weight: 400; }
textarea.field { box-sizing: border-box; height: auto; min-height: 104px; max-height: 35dvh; margin-top: 8px; padding: 12px 16px; resize: vertical; caret-color: var(--pen-ink); }
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
.discard-confirmation p { margin: 16px 0 0; }
.saving-spinner { width: 16px; height: 16px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: saving-spin 1s linear infinite; }
@keyframes saving-spin { to { transform: rotate(360deg); } }
@keyframes sheet-enter { from { transform: translateY(100%); } }
@media (min-width: 1024px) { .keyboard-hint { display: block; } }
@media (min-width: 1280px) {
  .contact-sheet { inset: 72px calc((100vw - 1120px) / 2 + 24px) auto auto; width: 496px; height: calc(100dvh - 144px); max-width: none; max-height: none; margin: 0; padding: 24px; border-bottom: 2px solid var(--ink); border-radius: var(--radius-md); animation-name: panel-enter; }
  .contact-sheet::backdrop { background: rgb(43 36 32 / 45%); clip-path: inset(48px max(0px, calc((100vw - 1120px) / 2)) 48px 50%); }
  .sheet-grip { display: none; }
}
@keyframes panel-enter { from { opacity: 0; transform: translateX(24px); } }
@media (prefers-reduced-motion: reduce) { .contact-sheet, .saving-spinner { animation: none; } }
</style>
