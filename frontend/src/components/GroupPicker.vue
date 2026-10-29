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
.group-fields, .group-colors { min-width: 0; padding: 0; margin: 0; border: 0; }
.group-fields > legend, .group-editor > label, .group-colors > legend { font-size: .875rem; font-weight: 500; }
.group-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 0; }
.edit-groups { min-height: 44px; padding: 0; border: 0; background: transparent; color: var(--neutral-700); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.delete-group { color: var(--error); border-color: var(--error); }
.group-chips, .group-editor-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.group-action { min-height: 44px; padding: 0 12px; border: 1.5px solid var(--ink); border-radius: var(--radius-pill); background: var(--sheet); cursor: pointer; }
.group-chip { position: relative; padding: 0; border: 0; border-radius: var(--radius-pill); background: transparent; cursor: pointer; max-width: 100%; }
.group-chip :deep(.group-badge), .group-color-choice :deep(.group-badge) { min-height: 44px; height: auto; padding: 0 12px; border: 1.5px solid var(--ink); border-radius: var(--radius-pill); box-shadow: none; color: var(--ink); font-size: .875rem; }
.group-chip[aria-pressed="false"] :deep(.group-badge) { background: var(--sheet); }
.group-chip[aria-pressed="true"] :deep(.group-badge) { border-width: 2px; padding-left: 28px; }
.selected-check { position: absolute; left: 10px; top: calc(50% - 7px); width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; }
.group-chip:hover :deep(.group-badge), .group-action:hover { border-color: var(--primary); }
.group-editor { margin-top: 16px; }
.group-editor > label { display: block; }
.field { box-sizing: border-box; }
.group-colors { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.group-color-choice { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
.group-color-choice input { accent-color: var(--primary); }
.group-error { color: var(--error); font-size: .875rem; line-height: 1.5; margin: 8px 0; }
.group-fields:disabled { opacity: .45; }
</style>
