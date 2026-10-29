<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { get_groups_for_form, send_group_creation_for_owner, send_group_update_for_owner, send_group_deletion_for_owner } from '../api/friends'
import type { FriendGroup, GroupWithFriendCount } from '../api/friends'
import { ApiError } from '../api/http'
import { set_group_for_friends, remove_group_for_friends } from '../friends'
import GroupBadge from './GroupBadge.vue'

const GROUP_COLOR_CHOICES = [
  { value: 'family', label: 'Pêssego' },
  { value: 'college', label: 'Amarelo' },
  { value: 'work', label: 'Azul' },
  { value: 'neighborhood', label: 'Verde' },
  { value: 'neutral', label: 'Creme' },
] as const
const selected_group_ids = defineModel<string[]>({ required: true })
const emit = defineEmits<{
  busy: [is_busy: boolean]
  updated: [group: FriendGroup]
  deleted: [group_id: string]
}>()
const groups = ref<GroupWithFriendCount[]>([])
const is_loading = ref(true)
const has_load_error = ref(false)
const is_saving = ref(false)
const is_editor_open = ref(false)
const is_editing_groups = ref(false)
const edited_group = ref<GroupWithFriendCount | null>(null)
const is_delete_confirmation_open = ref(false)
const delete_confirmation_button = ref<HTMLButtonElement | null>(null)
const group_name = ref('')
const group_color = ref<FriendGroup['color']>('neutral')
const name_input = ref<HTMLInputElement | null>(null)
const new_group_button = ref<HTMLButtonElement | null>(null)
const error_message = ref('')
const error_field = ref<string | null>(null)
const announcement = ref('')

async function get_groups_for_picker(): Promise<void> {
  is_loading.value = true
  has_load_error.value = false
  try {
    groups.value = await get_groups_for_form()
  } catch {
    has_load_error.value = true
  } finally {
    is_loading.value = false
  }
}

function set_group_selection(group_id: string): void {
  selected_group_ids.value = selected_group_ids.value.includes(group_id)
    ? selected_group_ids.value.filter((id) => id !== group_id)
    : [...selected_group_ids.value, group_id]
}

async function open_group_editor(group: GroupWithFriendCount | null = null): Promise<void> {
  edited_group.value = group
  group_name.value = group?.name ?? ''
  group_color.value = group?.color ?? 'neutral'
  is_delete_confirmation_open.value = false
  error_message.value = ''
  error_field.value = null
  is_editor_open.value = true
  await nextTick()
  name_input.value?.focus()
}

async function close_group_editor(): Promise<void> {
  is_editor_open.value = false
  is_delete_confirmation_open.value = false
  error_message.value = ''
  await nextTick()
  new_group_button.value?.focus()
}

function set_group_editing_mode(): void {
  is_editing_groups.value = !is_editing_groups.value
  void close_group_editor()
}

async function open_group_deletion_confirmation(): Promise<void> {
  is_delete_confirmation_open.value = true
  error_message.value = ''
  await nextTick()
  delete_confirmation_button.value?.focus()
}

async function close_group_deletion_confirmation(): Promise<void> {
  is_delete_confirmation_open.value = false
  error_message.value = ''
  await nextTick()
  name_input.value?.focus()
}

async function send_group_for_picker(): Promise<void> {
  if (is_saving.value || !name_input.value?.reportValidity()) return
  is_saving.value = true
  emit('busy', true)
  error_message.value = ''
  error_field.value = null
  try {
    const group_data = { name: group_name.value.trim(), color: group_color.value }
    const saved_group = edited_group.value
      ? await send_group_update_for_owner(edited_group.value.id, group_data)
      : await send_group_creation_for_owner(group_data)
    groups.value = [...groups.value.filter((group) => group.id !== saved_group.id), saved_group]
      .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR', { sensitivity: 'base' }))
    if (edited_group.value) {
      set_group_for_friends(saved_group)
      emit('updated', saved_group)
      announcement.value = `Grupo ${saved_group.name} atualizado.`
    } else {
      selected_group_ids.value = [...selected_group_ids.value, saved_group.id]
      announcement.value = `Grupo ${saved_group.name} criado e selecionado.`
    }
    await close_group_editor()
  } catch (error) {
    error_field.value = error instanceof ApiError ? error.field : null
    error_message.value = error instanceof ApiError
      ? `${error.message} Revise o grupo e tente novamente.`
      : 'Não foi possível salvar o grupo. Seus dados continuam aqui. Tente novamente.'
  } finally {
    is_saving.value = false
    emit('busy', false)
    await nextTick()
    if (!is_editor_open.value) new_group_button.value?.focus()
    else if (error_field.value === 'name') name_input.value?.focus()
  }
}

async function send_group_deletion_for_picker(): Promise<void> {
  if (is_saving.value || !is_delete_confirmation_open.value || !edited_group.value) return
  const group = edited_group.value
  is_saving.value = true
  emit('busy', true)
  error_message.value = ''
  try {
    await send_group_deletion_for_owner(group.id)
    groups.value = groups.value.filter((saved_group) => saved_group.id !== group.id)
    selected_group_ids.value = selected_group_ids.value.filter((id) => id !== group.id)
    remove_group_for_friends(group.id)
    emit('deleted', group.id)
    announcement.value = `Grupo ${group.name} apagado. Os amigos continuam no caderno.`
    await close_group_editor()
  } catch {
    error_message.value = 'Não foi possível apagar o grupo. Verifique sua conexão e tente novamente.'
  } finally {
    is_saving.value = false
    emit('busy', false)
    await nextTick()
    if (!is_editor_open.value) new_group_button.value?.focus()
    else if (is_delete_confirmation_open.value) delete_confirmation_button.value?.focus()
  }
}

onMounted(get_groups_for_picker)
</script>

<template>
  <section class="group-picker" aria-label="Grupos">
    <p v-if="is_loading" role="status">Carregando grupos…</p>
    <div v-else-if="has_load_error" role="alert">
      <p>Não foi possível carregar os grupos. Tente novamente.</p>
      <button type="button" name="retry-groups" class="group-action" @click="get_groups_for_picker">Tentar novamente</button>
    </div>
    <fieldset v-else class="group-fields" :disabled="is_saving" :aria-busy="is_saving">
      <legend class="group-heading">
        <span>Grupos (opcional)</span>
        <button v-if="groups.length" type="button" name="edit-groups" class="edit-groups" :aria-pressed="is_editing_groups" @click="set_group_editing_mode">{{ is_editing_groups ? 'pronto' : 'editar' }}</button>
      </legend>
      <div class="group-chips">
        <button v-for="group in groups" :key="group.id" type="button" class="group-chip"
          :aria-pressed="is_editing_groups ? undefined : selected_group_ids.includes(group.id)"
          :aria-label="is_editing_groups ? `Editar grupo ${group.name}` : undefined"
          @click="is_editing_groups ? open_group_editor(group) : set_group_selection(group.id)">
          <svg v-if="!is_editing_groups && selected_group_ids.includes(group.id)" class="selected-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
          <GroupBadge :group="group" />
        </button>
        <button ref="new_group_button" type="button" name="new-group" class="group-action" :aria-expanded="is_editor_open && !edited_group" @click="open_group_editor()">+ novo grupo</button>
      </div>
      <div v-if="is_delete_confirmation_open && edited_group" class="group-editor">
        <p role="alert">Apagar '{{ edited_group.name }}'?
          <template v-if="edited_group.friends_count > 0">{{ edited_group.friends_count }} {{ edited_group.friends_count === 1 ? 'amigo sai' : 'amigos saem' }} desse grupo, mas {{ edited_group.friends_count === 1 ? 'continua' : 'continuam' }} no seu caderno.</template>
          <template v-else>Nenhum amigo está nesse grupo.</template>
        </p>
        <p v-if="error_message" class="group-error" role="alert">{{ error_message }}</p>
        <div class="group-editor-actions">
          <button ref="delete_confirmation_button" type="button" name="confirm-delete-group" class="group-action delete-group" @click="send_group_deletion_for_picker">{{ is_saving ? 'Apagando…' : 'Apagar grupo' }}</button>
          <button type="button" name="cancel-delete-group" class="group-action" @click="close_group_deletion_confirmation">Cancelar</button>
        </div>
      </div>
      <div v-else-if="is_editor_open" class="group-editor">
        <label for="group-name">Nome do grupo</label>
        <input id="group-name" ref="name_input" v-model="group_name" class="field" name="group_name" required maxlength="100"
          :aria-invalid="error_field === 'name' ? 'true' : undefined"
          :aria-describedby="error_field === 'name' ? 'group-name-error' : undefined"
          @keydown.enter.prevent="send_group_for_picker">
        <p v-if="error_field === 'name'" id="group-name-error" class="group-error" role="alert">{{ error_message }}</p>
        <fieldset class="group-colors"
          :aria-invalid="error_field === 'color' ? 'true' : undefined"
          :aria-describedby="error_field === 'color' ? 'group-color-error' : undefined">
          <legend>Cor do grupo</legend>
          <label v-for="color in GROUP_COLOR_CHOICES" :key="color.value" class="group-color-choice">
            <input v-model="group_color" type="radio" name="group_color" :value="color.value">
            <GroupBadge :group="{ name: color.label, color: color.value }" />
          </label>
        </fieldset>
        <p v-if="error_field === 'color'" id="group-color-error" class="group-error" role="alert">{{ error_message }}</p>
        <p v-if="error_message && error_field !== 'name' && error_field !== 'color'" class="group-error" role="alert">{{ error_message }}</p>
        <div class="group-editor-actions">
          <button type="button" name="save-group" class="group-action" @click="send_group_for_picker">{{ is_saving ? 'Salvando…' : (edited_group ? 'Salvar grupo' : 'Criar grupo') }}</button>
          <button v-if="edited_group" type="button" name="delete-group" class="group-action delete-group" @click="open_group_deletion_confirmation">Apagar grupo</button>
          <button type="button" class="group-action" @click="close_group_editor">Cancelar</button>
        </div>
      </div>
    </fieldset>
    <p class="sr-only" role="status">{{ announcement }}</p>
  </section>
</template>

<style scoped>
.group-picker>p{margin:0;line-height:var(--notebook-line)}
.group-fields,.group-colors{min-width:0;margin:0;padding:0;border:0}
.group-fields:disabled{opacity:.45}
.group-heading{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:.5rem;width:100%;font:700 1.375rem/var(--notebook-line) var(--font-handwriting);color:var(--pen-ink)}
.edit-groups{flex:none;height:2.75rem;min-height:0;margin:-.75rem 0 0;padding:.75rem .25rem 0;border:0;background:none;cursor:pointer;
 font:500 .875rem/var(--notebook-line) var(--font-ui);color:var(--neutral-700);text-decoration:underline;text-underline-offset:3px}
.edit-groups[aria-pressed="true"]{font-weight:700;color:var(--ink)}

.group-chips{display:flex;flex-wrap:wrap;gap:1.25rem .5rem;padding:.625rem 0}
.group-chip{position:relative;min-width:2.75rem;max-width:100%;padding:0;border:0;border-radius:4px;background:none;cursor:pointer}
.group-chip:nth-child(3n+1){transform:rotate(-1.5deg)}.group-chip:nth-child(3n+2){transform:rotate(1deg)}.group-chip:nth-child(3n){transform:rotate(-.5deg)}
.group-chip :deep(.group-badge){height:2.75rem;max-width:100%;padding:0 .875rem;border:1.5px dashed var(--neutral-500);border-radius:4px;background:var(--sheet);box-shadow:none;filter:none;
 font:500 .9375rem/1 var(--font-ui);color:var(--ink)}
.group-chip[aria-pressed="true"] :deep(.group-badge){padding-left:2rem;border:2px solid var(--ink);background:var(--group-color);box-shadow:var(--shadow-paper)}
.group-chip :deep(.group-badge)::before{content:none}
.selected-check{position:absolute;z-index:1;left:.75rem;top:calc(50% - .4375rem);width:.875rem;height:.875rem;fill:none;stroke:var(--ink);stroke-width:2.5}
.group-chip:hover :deep(.group-badge){border-color:var(--primary)}

.group-chip:not([aria-pressed]){transform:none}
.group-chip:not([aria-pressed]) :deep(.group-badge){border:2px dashed var(--pen-ink);background:var(--group-color);text-decoration:underline;text-underline-offset:3px}
.group-chips>.group-action{height:2.75rem;min-height:0;padding:0 .875rem;border:1.5px dashed var(--neutral-500);border-radius:4px;background:none;cursor:pointer;
 font:500 .9375rem/1 var(--font-ui);color:var(--neutral-700)}

.group-editor{margin:0}
.group-editor>p:not(.group-error){margin:0;font:400 1rem/var(--notebook-line) var(--font-ui)}
.group-editor .field{position:relative;z-index:1;display:block;width:100%;height:3rem;margin-top:-1rem;padding:1rem .25rem 0;border:0;border-radius:0;
 font:400 1rem/var(--notebook-line) var(--font-ui);color:var(--ink);background:linear-gradient(var(--neutral-500),var(--neutral-500)) no-repeat 0 calc(100% - .3125rem)/100% 1.5px}
.group-editor .field:focus{outline:none;box-shadow:none;background:linear-gradient(var(--focus),var(--focus)) no-repeat 0 calc(100% - .25rem)/100% 3px,linear-gradient(var(--highlight-50),var(--highlight-50)) no-repeat 0 calc(100% - .3125rem)/100% 1.6875rem}
.group-editor .field[aria-invalid="true"]{background:linear-gradient(var(--error),var(--error)) no-repeat 0 calc(100% - .25rem)/100% 2.5px}
.group-colors{display:flex;flex-wrap:wrap;gap:1.25rem .5rem;padding:0 0 .625rem}
.group-colors>legend{width:100%;padding:0 0 .625rem}
.group-color-choice{position:relative;display:inline-flex;align-items:center;min-height:2.75rem;padding:0 .5rem;cursor:pointer}
.group-color-choice input{position:absolute;width:1px;height:1px;margin:0;opacity:0}
.group-color-choice:has(input:checked)::before{content:"";position:absolute;inset:0;border:2px solid var(--pen-ink);border-radius:50% 46% 52% 44%/60% 50% 55% 45%;transform:rotate(-2deg)}
.group-color-choice:has(input:focus-visible){box-shadow:var(--focus-ring);border-radius:var(--radius-sm)}
.group-color-choice:hover :deep(.group-badge){color:var(--pen-ink)}
.group-color-choice :deep(.group-badge){height:1.5rem;padding:0 .5rem;font:500 .875rem/1.5rem var(--font-ui);color:var(--ink)}
.group-editor-actions{display:flex;flex-wrap:wrap;gap:1.25rem 1rem;padding:.625rem 0}
.group-editor-actions>.group-action{height:2.75rem;min-height:0;padding:0 1rem;border:1.5px solid var(--neutral-500);border-radius:var(--radius-pill);background:var(--sheet);cursor:pointer;
 font:500 .9375rem/1 var(--font-ui);color:var(--ink)}
.group-editor-actions>[name="save-group"]{border:2px solid var(--primary);color:var(--primary-800);font-weight:600}
.group-editor-actions>.delete-group{border-color:var(--error);color:var(--error)}

.group-editor>label,.group-colors>legend{display:block;padding:0;font:700 1.375rem/var(--notebook-line) var(--font-handwriting);color:var(--pen-ink)}

.group-error{display:flex;gap:.375rem;margin:0;font:400 .875rem/var(--notebook-line) var(--font-ui);color:var(--error);pointer-events:none}
.group-error::before{content:"!";flex:none;display:grid;place-items:center;width:1rem;height:1rem;margin-top:.5rem;border-radius:50%;background:var(--error);color:var(--sheet);font:700 .6875rem/1 var(--font-ui)}

.group-editor .field[aria-invalid="true"]:focus{background:linear-gradient(var(--error),var(--error)) no-repeat 0 calc(100% - .25rem)/100% 3px,linear-gradient(var(--highlight-50),var(--highlight-50)) no-repeat 0 calc(100% - .3125rem)/100% 1.6875rem}
.group-action{min-height:2.75rem;min-width:2.75rem;cursor:pointer}
</style>
