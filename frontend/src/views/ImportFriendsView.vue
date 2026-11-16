<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, onBeforeRouteLeave } from 'vue-router'
import { get_friends_for_board, send_friends_import_for_owner } from '../api/friends'
import type { BoardFriend, FriendWriteData } from '../api/friends'
import { ApiError } from '../api/http'
import { AgendaReadException } from '../agenda'
import { read_agenda_for_import } from '../agenda-worker'
import { AgendaImportStep, agenda_import_state, clear_agenda_import, current_agenda_contact, get_draft_for_agenda_contact, remaining_agenda_contacts, selected_agenda_contacts, set_agenda_for_import, set_import_result_for_agenda, set_saved_friend_for_agenda, start_completing_agenda_contacts } from '../agenda-import'
import { get_agenda_contacts_from_browser, is_contact_picker_available_for_browser } from '../contact-picker'
import AgendaContactList from '../components/AgendaContactList.vue'
import FriendForm from '../components/FriendForm.vue'

const MAX_SUCCESS_NAMES = 12
const WAIT_FOR_OPERATION_MESSAGE = 'Aguarde a operação terminar antes de sair desta página.'
const VALIDATION_ERROR_STATUS = 400
const BODY_TOO_LARGE_STATUS = 413
const BULK_ENTRY_FIELD_PATTERN = /^friends\.(\d+)\./
const root = ref<HTMLElement | null>(null)
const heading = ref<HTMLHeadingElement | null>(null)
const file_input = ref<HTMLInputElement | null>(null)
const return_button = ref<HTMLButtonElement | null>(null)
const confirmation = ref<HTMLDialogElement | null>(null)
const keep_completing_button = ref<HTMLButtonElement | null>(null)
const bulk_confirmation = ref<HTMLDialogElement | null>(null)
const bulk_action = ref<HTMLButtonElement | null>(null)
const keep_editing_button = ref<HTMLButtonElement | null>(null)
const is_bulk_saving = ref(false)
const is_loading = ref(true)
const has_load_error = ref(false)
const error_message = ref('')
const import_error = ref<HTMLParagraphElement | null>(null)
const has_file_error = ref(false)
const is_picker_available = is_contact_picker_available_for_browser()
const can_choose = computed(() => !is_loading.value && !has_load_error.value && !agenda_import_state.is_busy)
let is_active = true
let read_controller: AbortController | null = null

async function get_friends_for_import(): Promise<void> {
  is_loading.value = true
  has_load_error.value = false
  try {
    const friends = await get_friends_for_board()
    if (is_active) agenda_import_state.existing_friends = friends
  } catch {
    if (is_active) has_load_error.value = true
  } finally {
    if (is_active) is_loading.value = false
  }
}

async function read_file_for_import(event: Event): Promise<void> {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  const file = input.files?.[0]
  input.value = ''
  if (!file || !can_choose.value) return
  read_controller?.abort()
  const controller = new AbortController()
  read_controller = controller
  error_message.value = ''
  has_file_error.value = false
  agenda_import_state.step = AgendaImportStep.READING
  try {
    const result = await read_agenda_for_import(file, controller.signal)
    if (is_active && !controller.signal.aborted) set_agenda_for_import(result)
  } catch (error) {
    if (!is_active || controller.signal.aborted) return
    agenda_import_state.step = AgendaImportStep.FILE
    has_file_error.value = true
    error_message.value = error instanceof AgendaReadException ? error.message : 'Não foi possível ler a agenda. Escolha o arquivo novamente.'
  }
}

async function choose_contacts_from_browser(): Promise<void> {
  if (!can_choose.value) return
  error_message.value = ''
  agenda_import_state.is_busy = true
  try {
    const result = await get_agenda_contacts_from_browser()
    if (is_active && result) {
      agenda_import_state.is_busy = false
      set_agenda_for_import(result, true)
    }
  } catch (error) {
    if (is_active) error_message.value = error instanceof AgendaReadException ? error.message : 'Não deu pra abrir a agenda. Você pode enviar um arquivo .vcf.'
  } finally {
    if (is_active) agenda_import_state.is_busy = false
  }
}

function set_draft_for_import(draft: FriendWriteData): void {
  if (current_agenda_contact.value) agenda_import_state.drafts[current_agenda_contact.value.id] = draft
}

function set_saved_friend_for_import(friend: BoardFriend): void {
  error_message.value = ''
  if (is_active && current_agenda_contact.value) set_saved_friend_for_agenda(current_agenda_contact.value, friend)
}

async function open_agenda_selection(): Promise<void> {
  if (agenda_import_state.is_busy) return
  if (agenda_import_state.saved_friends.length) {
    confirmation.value?.showModal()
    await nextTick()
    keep_completing_button.value?.focus()
  } else agenda_import_state.step = AgendaImportStep.SELECT
}

function return_to_agenda_selection(): void {
  confirmation.value?.close()
  agenda_import_state.step = AgendaImportStep.SELECT
}

function keep_completing_agenda(): void {
  confirmation.value?.close()
  return_button.value?.focus()
}

async function open_bulk_confirmation(): Promise<void> {
  if (agenda_import_state.is_busy || !remaining_agenda_contacts.value.length) return
  error_message.value = ''
  bulk_confirmation.value?.showModal()
  await nextTick()
  keep_editing_button.value?.focus()
}

function keep_editing_agenda(): void {
  if (is_bulk_saving.value) return
  bulk_confirmation.value?.close()
  bulk_action.value?.focus()
}

async function send_remaining_friends_for_import(): Promise<void> {
  if (agenda_import_state.is_busy || !remaining_agenda_contacts.value.length) return
  const contacts = [...remaining_agenda_contacts.value]
  // Approved CRM-30 deviation: defaults reset cadence/groups, retaining personal edits.
  const friends = contacts.map((contact) => {
    const draft = get_draft_for_agenda_contact(contact)
    return { name: draft.name.trim(), phone: draft.phone || null, birthday: draft.birthday || null }
  })
  is_bulk_saving.value = true
  agenda_import_state.is_busy = true
  try {
    const result = await send_friends_import_for_owner(friends)
    if (is_active) {
      bulk_confirmation.value?.close()
      set_import_result_for_agenda(contacts, result)
    }
  } catch (error) {
    if (!is_active) return
    bulk_confirmation.value?.close()
    if (error instanceof ApiError && error.status === BODY_TOO_LARGE_STATUS) {
      error_message.value = 'O lote ficou grande demais. Volte à lista, selecione menos amigos e tente novamente.'
    } else if (error instanceof ApiError && error.status === VALIDATION_ERROR_STATUS) {
      const index = Number(error.field?.match(BULK_ENTRY_FIELD_PATTERN)?.[1])
      const friend = friends[index]
      error_message.value = `${friend ? `Amigo ${index + 1} (${friend.name}): ` : ''}${error.message} Revise os cartões e tente novamente.`
    } else {
      error_message.value = 'Não foi possível confirmar a importação. Seus dados continuam aqui. Confira a lista de amigos antes de tentar novamente.'
    }
    await nextTick()
    if (is_active) import_error.value?.focus()
  } finally {
    if (is_active) {
      is_bulk_saving.value = false
      agenda_import_state.is_busy = false
    }
  }
}

function return_to_selection_from_keyboard(event: KeyboardEvent): void {
  if (event.key === 'Escape' && !event.defaultPrevented && agenda_import_state.step === AgendaImportStep.COMPLETE && !confirmation.value?.open && !bulk_confirmation.value?.open) {
    event.preventDefault()
    void open_agenda_selection()
  }
}

watch([() => agenda_import_state.step, () => agenda_import_state.queue_index], async () => {
  await nextTick()
  if (!is_active) return
  const page = root.value?.closest<HTMLElement>('.page-content')
  if (page) page.scrollTop = 0
  if (agenda_import_state.step !== AgendaImportStep.COMPLETE) heading.value?.focus()
})
onBeforeRouteLeave(() => {
  if (!agenda_import_state.is_busy) return true
  error_message.value = WAIT_FOR_OPERATION_MESSAGE
  return false
})
watch(() => agenda_import_state.is_busy, (is_busy) => {
  if (!is_busy && error_message.value === WAIT_FOR_OPERATION_MESSAGE) error_message.value = ''
})
onMounted(() => {
  void get_friends_for_import()
  heading.value?.focus()
  window.addEventListener('keydown', return_to_selection_from_keyboard)
})
onBeforeUnmount(() => {
  is_active = false
  read_controller?.abort()
  window.removeEventListener('keydown', return_to_selection_from_keyboard)
  clear_agenda_import()
})
</script>

<template>
  <div ref="root" class="agenda-import-page">
    <template v-if="agenda_import_state.step === AgendaImportStep.FILE || agenda_import_state.step === AgendaImportStep.READING">
      <RouterLink to="/amigos" class="agenda-back-link">Voltar</RouterLink>
      <h1 ref="heading" class="view-title" tabindex="-1">Importar contatos</h1>
      <p class="agenda-help">{{ is_picker_available ? 'Escolha os amigos pela agenda ou envie um arquivo.' : 'Escolha o arquivo da agenda. Depois você marca só os amigos.' }}</p>
      <p class="agenda-privacy">A leitura acontece aqui no navegador. Só os amigos que você salvar vão para o servidor.</p>
      <p v-if="is_loading" class="agenda-help" role="status">Conferindo quem já está no caderno…</p>
      <div v-if="has_load_error" class="agenda-error" role="alert">
        <p>Não foi possível conferir os amigos já cadastrados. Verifique sua conexão e tente novamente.</p>
        <button type="button" class="stamp" @click="get_friends_for_import">Tentar novamente</button>
      </div>
      <div v-if="agenda_import_state.step === AgendaImportStep.READING" role="status" aria-busy="true">
        <p class="handwritten-note">Lendo a agenda…</p><p class="agenda-help">Isso leva só um instante.</p>
      </div>
      <template v-else>
        <p v-if="error_message" class="agenda-error" role="alert">{{ error_message }}</p>
        <div class="agenda-file-actions">
          <button v-if="is_picker_available" type="button" class="stamp-filled" :disabled="!can_choose" @click="choose_contacts_from_browser">Escolher da agenda</button>
          <button type="button" :class="is_picker_available ? 'agenda-text-action' : 'stamp-filled'" :disabled="!can_choose" @click="file_input?.click()">
            {{ is_picker_available ? 'ou envie um arquivo .vcf ou CSV' : has_file_error ? 'Escolher outro arquivo' : 'Escolher arquivo' }}
          </button>
          <input ref="file_input" class="sr-only" type="file" accept=".vcf,.csv,text/vcard,text/x-vcard,text/csv" tabindex="-1" aria-label="Arquivo da agenda" :disabled="!can_choose" @change="read_file_for_import">
        </div>
        <ul class="agenda-export-help">
          <li><strong>Android</strong><p>No app Contatos, toque em Exportar e escolha o arquivo .vcf.</p></li>
          <li><strong>iPhone</strong><p>Exporte pelo iCloud.com ou compartilhe um arquivo .vcf pelo app Contatos.</p></li>
        </ul>
      </template>
    </template>

    <template v-else-if="agenda_import_state.step === AgendaImportStep.SELECT">
      <button type="button" class="agenda-back-link" @click="agenda_import_state.step = AgendaImportStep.FILE">Escolher outro arquivo</button>
      <h1 ref="heading" class="view-title" tabindex="-1">Quem entra no caderno</h1>
      <p class="agenda-help">Ninguém vem marcado. Escolha só os amigos.</p>
      <AgendaContactList />
      <p v-if="agenda_import_state.skipped_without_name" class="agenda-help">{{ agenda_import_state.skipped_without_name }} {{ agenda_import_state.skipped_without_name === 1 ? 'contato sem nome ficou de fora.' : 'contatos sem nome ficaram de fora.' }}</p>
      <div class="agenda-selection-actions">
        <p aria-live="polite">{{ selected_agenda_contacts.length }} {{ selected_agenda_contacts.length === 1 ? 'selecionado' : 'selecionados' }}</p>
        <button type="button" class="stamp-filled" :disabled="!selected_agenda_contacts.length" @click="start_completing_agenda_contacts">
          {{ selected_agenda_contacts.length ? `Continuar com ${selected_agenda_contacts.length}` : 'Continuar' }}
        </button>
      </div>
    </template>

    <template v-else-if="agenda_import_state.step === AgendaImportStep.COMPLETE && current_agenda_contact">
      <button ref="return_button" type="button" class="agenda-back-link" :disabled="agenda_import_state.is_busy" @click="open_agenda_selection">Voltar à lista</button>
      <div class="agenda-progress" role="status" aria-live="polite">
        <span>{{ agenda_import_state.queue_index + 1 }} de {{ agenda_import_state.queue_ids.length }}</span>
        <progress :value="agenda_import_state.queue_index + 1" :max="agenda_import_state.queue_ids.length" :aria-label="`Progresso, ${agenda_import_state.queue_index + 1} de ${agenda_import_state.queue_ids.length}`"></progress>
      </div>
      <h1 ref="heading" class="view-title" tabindex="-1">Completar amigos</h1>
      <p class="agenda-help">Confira os dados e complete o que faltar.</p>
      <p v-if="error_message" ref="import_error" class="agenda-error" role="alert" tabindex="-1">{{ error_message }}</p>
      <!-- Approved CRM-30 deviation: the shared form keeps group creation available during import. -->
      <FriendForm :key="current_agenda_contact.id" :initial_values="get_draft_for_agenda_contact(current_agenda_contact)" :phone_options="current_agenda_contact.phones.map(phone => phone.number)"
        :submit_label="agenda_import_state.queue_index === agenda_import_state.queue_ids.length - 1 ? 'Salvar e concluir' : 'Salvar e próximo'"
        @saved="set_saved_friend_for_import" @draft_changed="set_draft_for_import" @busy="agenda_import_state.is_busy = $event" @phone_conflict="get_friends_for_import">
        <template #before-submit="{ is_busy, save_with_defaults }">
          <button type="button" class="agenda-skip" aria-label="Pular e salvar com ritmo de 1 mês e sem grupo" :disabled="is_busy" @click="save_with_defaults">
            <span>Pular</span><small>salva com 1 mês, sem grupo</small>
          </button>
        </template>
        <template #after-submit="{ is_busy }">
          <button ref="bulk_action" type="button" class="agenda-text-action agenda-bulk-action" :disabled="is_busy || agenda_import_state.is_busy" @click="open_bulk_confirmation">Salvar os restantes como estão</button>
        </template>
      </FriendForm>
    </template>

    <template v-else-if="agenda_import_state.step === AgendaImportStep.DONE">
      <h1 ref="heading" class="view-title" tabindex="-1">Pronto</h1>
      <p class="handwritten-note" role="status">{{ agenda_import_state.saved_friends.length }} {{ agenda_import_state.saved_friends.length === 1 ? 'amigo adicionado.' : 'amigos adicionados.' }}</p>
      <p v-if="agenda_import_state.ignored_existing_count" class="agenda-help">{{ agenda_import_state.ignored_existing_count }} {{ agenda_import_state.ignored_existing_count === 1 ? 'já estava no caderno.' : 'já estavam no caderno.' }}</p>
      <ul class="agenda-saved-names" aria-label="Amigos adicionados">
        <li v-for="friend in agenda_import_state.saved_friends.slice(0, MAX_SUCCESS_NAMES)" :key="friend.id"><RouterLink :to="`/amigos/${friend.id}`">{{ friend.name }}</RouterLink></li>
      </ul>
      <p v-if="agenda_import_state.saved_friends.length > MAX_SUCCESS_NAMES">E mais {{ agenda_import_state.saved_friends.length - MAX_SUCCESS_NAMES }} amigos adicionados.</p>
      <div v-if="agenda_import_state.ignored_contacts.length" class="agenda-ignored">
        <p class="agenda-help">{{ agenda_import_state.ignored_contacts.length }} {{ agenda_import_state.ignored_contacts.length === 1 ? 'não entrou: telefone já cadastrado ou repetido na seleção.' : 'não entraram: telefones já cadastrados ou repetidos na seleção.' }}</p>
        <ul class="agenda-saved-names" aria-label="Amigos ignorados por telefone repetido">
          <li v-for="(contact, index) in agenda_import_state.ignored_contacts.slice(0, MAX_SUCCESS_NAMES)" :key="index"><RouterLink :to="`/amigos/${contact.friend_id}`">{{ contact.name }}</RouterLink></li>
        </ul>
        <p v-if="agenda_import_state.ignored_contacts.length > MAX_SUCCESS_NAMES" class="agenda-help">E mais {{ agenda_import_state.ignored_contacts.length - MAX_SUCCESS_NAMES }} ignorados pelo mesmo motivo.</p>
      </div>
      <RouterLink to="/amigos" class="agenda-back-link">ver a lista de amigos</RouterLink>
      <button v-if="!agenda_import_state.saved_friends.length" type="button" class="agenda-text-action" @click="agenda_import_state.step = AgendaImportStep.FILE">Escolher outros contatos</button>
    </template>

    <dialog ref="confirmation" class="agenda-confirmation paper-surface" aria-labelledby="agenda-return-title" @cancel.prevent="keep_completing_agenda">
      <h2 id="agenda-return-title">Voltar à lista?</h2>
      <p>{{ agenda_import_state.saved_friends.length }} {{ agenda_import_state.saved_friends.length === 1 ? 'amigo já entrou' : 'amigos já entraram' }} no caderno. Os outros voltam para a lista, e você pode desmarcar quem não quiser.</p>
      <div class="agenda-confirmation-actions">
        <button type="button" class="stamp-filled" @click="return_to_agenda_selection">Voltar à lista</button>
        <button ref="keep_completing_button" type="button" class="agenda-text-action" @click="keep_completing_agenda">Continuar completando</button>
      </div>
    </dialog>
    <dialog ref="bulk_confirmation" class="agenda-confirmation paper-surface" aria-labelledby="agenda-bulk-title" @cancel.prevent="keep_editing_agenda">
      <h2 id="agenda-bulk-title">Salvar os restantes como estão?</h2>
      <p>{{ remaining_agenda_contacts.length }} {{ remaining_agenda_contacts.length === 1 ? 'amigo vai' : 'amigos vão' }} com ritmo de 1 mês e sem grupo. Nome, telefone e aniversário ficam com as edições dos cartões.</p>
      <p>Telefones repetidos serão ignorados. Amigos já cadastrados continuam como estão.</p>
      <p v-if="is_bulk_saving" role="status" aria-live="polite">Salvando os restantes… Aguarde a confirmação.</p>
      <div class="agenda-confirmation-actions">
        <button type="button" class="stamp-filled" :disabled="is_bulk_saving" @click="send_remaining_friends_for_import">{{ is_bulk_saving ? 'Salvando…' : 'Salvar restantes' }}</button>
        <button ref="keep_editing_button" type="button" class="agenda-text-action" :disabled="is_bulk_saving" @click="keep_editing_agenda">Revisar cartões</button>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.agenda-import-page{min-height:100%;overflow-wrap:anywhere}
.agenda-back-link,.agenda-text-action{display:inline-flex;align-items:center;min-height:2.75rem;padding:0;border:0;background:none;color:var(--neutral-700);font:500 .875rem/var(--notebook-line) var(--font-ui);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.agenda-back-link:disabled,.agenda-text-action:disabled,.agenda-skip:disabled{opacity:.45;cursor:wait}
.agenda-bulk-action{flex:1 1 100%;justify-content:flex-start}
.agenda-help,.agenda-privacy{margin:0;color:var(--neutral-600)}
.agenda-privacy{margin:var(--notebook-line) 0}
.agenda-file-actions{display:flex;flex-direction:column;align-items:flex-start;gap:var(--notebook-line);margin:var(--notebook-line) 0}
.agenda-export-help{list-style:none;padding:0;margin:calc(var(--notebook-line) * 2) 0 var(--notebook-line)}
.agenda-export-help li{margin:0 0 var(--notebook-line)}
.agenda-export-help strong{font:700 1.375rem/var(--notebook-line) var(--font-handwriting);color:var(--pen-ink)}
.agenda-export-help p{margin:0}
.agenda-error{margin:var(--notebook-line) 0;color:var(--error)}
.agenda-error p{margin:0 0 var(--notebook-line)}
.agenda-selection-actions{position:sticky;bottom:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem;
 margin:var(--notebook-line) 0 0;padding:1rem 0 calc(.5rem + env(safe-area-inset-bottom));background:var(--sheet);border-top:1px solid var(--ruling)}
.agenda-selection-actions p{margin:0;color:var(--pen-ink);font-variant-numeric:tabular-nums}
/* Cover the notebook's bottom scroll padding so rows never peek below the actions. */
.agenda-selection-actions::after{content:"";position:absolute;inset:100% 0 auto;height:calc(var(--notebook-line) * 2);background:var(--sheet);pointer-events:none}
.agenda-selection-actions .stamp-filled{font-size:1.5rem;padding-inline:1rem}
.agenda-progress{display:flex;align-items:center;gap:1rem;min-height:var(--notebook-line);margin:0 0 var(--notebook-line);color:var(--neutral-700);font-size:.875rem;font-variant-numeric:tabular-nums}
.agenda-progress span{flex:none}
.agenda-progress progress{appearance:none;flex:1;min-width:0;height:4px;border:0;border-radius:var(--radius-sm);background:var(--neutral-300);accent-color:var(--primary)}
.agenda-progress progress::-webkit-progress-bar{background:var(--neutral-300);border-radius:var(--radius-sm)}
.agenda-progress progress::-webkit-progress-value{background:var(--primary);border-radius:var(--radius-sm)}
.agenda-progress progress::-moz-progress-bar{background:var(--primary);border-radius:var(--radius-sm)}
.agenda-skip{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;max-width:6rem;min-height:3rem;padding:0;border:0;background:none;color:var(--neutral-700);text-align:left;cursor:pointer}
.agenda-skip span{font:500 .875rem/1.25 var(--font-ui);text-decoration:underline;text-underline-offset:3px}
.agenda-skip small{font:400 .75rem/1.25 var(--font-ui);color:var(--neutral-600)}
.agenda-saved-names{padding:0;list-style:none;margin:var(--notebook-line) 0}
.agenda-saved-names li{font:600 1.1875rem/var(--notebook-line) var(--font-title)}
.agenda-saved-names a{display:block;min-height:calc(var(--notebook-line) * 2);color:var(--ink);text-decoration:underline;text-underline-offset:3px}
.agenda-ignored{margin:var(--notebook-line) 0}
.agenda-confirmation{box-sizing:border-box;width:calc(100% - 2rem);max-width:30rem;max-height:90dvh;overflow:auto;margin:auto;padding:1.5rem;color:var(--ink);font:400 1rem/1.5 var(--font-ui)}
.agenda-confirmation::backdrop{background:rgb(43 36 32 / 45%)}
.agenda-confirmation h2{margin:0 0 1rem;font:600 1.1875rem/1.5 var(--font-title)}
.agenda-confirmation p{margin:0 0 1rem}
.agenda-confirmation-actions{display:flex;flex-wrap:wrap;gap:1rem;align-items:center}
@media(min-width:1280px){.agenda-selection-actions{display:none}}
</style>
