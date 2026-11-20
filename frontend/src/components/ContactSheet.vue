<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import type { BoardFriend, ContactRecording } from '../api/friends'
import ContactForm from './ContactForm.vue'

defineProps<{ friend: BoardFriend; friends?: BoardFriend[] }>()
const emit = defineEmits<{ close: []; recorded: [recording: ContactRecording] }>()
const NOTE_AUTOFOCUS_MIN_WIDTH = 1024
const DISMISS_DRAG_DISTANCE = 80
const dialog = ref<HTMLDialogElement | null>(null)
const form = ref<InstanceType<typeof ContactForm> | null>(null)
const keep_note_button = ref<HTMLButtonElement | null>(null)
const is_confirming_discard = ref(false)
let drag_start_y = 0

/** Keep unsaved text until the owner explicitly discards it; wait for pending writes. */
async function request_sheet_close(): Promise<void> {
  if (form.value?.is_saving) return
  if (form.value?.has_note_for_contact()) {
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
  form.value?.focus_note_for_contact()
}

onMounted(() => {
  dialog.value?.showModal()
  if (window.innerWidth >= NOTE_AUTOFOCUS_MIN_WIDTH) form.value?.focus_note_for_contact()
})
</script>

<template>
  <dialog ref="dialog" class="contact-sheet paper-surface" aria-labelledby="contact-sheet-title" @cancel.prevent="request_sheet_close" @click.self="request_sheet_close_from_backdrop">
    <div class="sheet-grip" aria-hidden="true" @pointerdown="drag_start_y = $event.clientY; ($event.currentTarget as HTMLElement).setPointerCapture($event.pointerId)" @pointerup="request_sheet_close_from_drag"><span></span></div>
    <header class="sheet-heading">
      <h2 id="contact-sheet-title">Falei com {{ friend.name }}</h2>
      <button type="button" class="close-button" aria-label="Fechar" :disabled="form?.is_saving" @click="request_sheet_close">
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
    <ContactForm v-show="!is_confirming_discard" ref="form" :friend="friend" :friends="friends"
      @cancel="request_sheet_close" @recorded="emit('recorded', $event)" />
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
.sheet-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.sheet-actions button { flex: 1; min-height: 48px; padding: 8px 16px; border: 1.5px solid var(--ink); border-radius: var(--radius-pill); font-weight: 600; }
.secondary-button { background: var(--sheet); color: var(--ink); }
.secondary-button:hover:not(:disabled) { background: var(--neutral-100); }
.sheet-actions .primary-button { display: flex; align-items: center; justify-content: center; gap: 8px; border-color: var(--primary); background: var(--primary); color: #fff; }
.primary-button:hover:not(:disabled) { background: var(--primary-hover); }
.primary-button:active:not(:disabled) { background: var(--primary-pressed); }
.discard-confirmation p { margin: 16px 0 0; }
@keyframes sheet-enter { from { transform: translateY(100%); } }
@media (min-width: 1280px) {
  .contact-sheet { inset: 72px calc((100vw - 1120px) / 2 + 24px) auto auto; width: 496px; height: calc(100dvh - 144px); max-width: none; max-height: none; margin: 0; padding: 24px; border-bottom: 2px solid var(--ink); border-radius: var(--radius-md); animation-name: panel-enter; }
  .contact-sheet::backdrop { background: rgb(43 36 32 / 45%); clip-path: inset(48px max(0px, calc((100vw - 1120px) / 2)) 48px 50%); }
  .sheet-grip { display: none; }
}
@keyframes panel-enter { from { opacity: 0; transform: translateX(24px); } }
@media (prefers-reduced-motion: reduce) { .contact-sheet { animation: none; } }
</style>
