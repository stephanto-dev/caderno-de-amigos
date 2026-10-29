<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { send_friend_creation_for_owner, send_friend_update_for_owner } from '../api/friends'
import type { BoardFriend, FriendGroup, FriendWriteData } from '../api/friends'
import { ApiError } from '../api/http'
import GroupPicker from './GroupPicker.vue'

const DEFAULT_CADENCE_AMOUNT = 1
const DEFAULT_CADENCE_UNIT = 'month'
const CADENCE_UNITS = [
  { value: 'day', label: 'Dias' },
  { value: 'week', label: 'Semanas' },
  { value: 'month', label: 'Meses' },
  { value: 'year', label: 'Anos' },
] as const
const props = defineProps<{ friend?: BoardFriend }>()
const emit = defineEmits<{
  saved: [friend: BoardFriend]
  cancel: []
  group_updated: [group: FriendGroup]
  group_deleted: [group_id: string]
}>()
const name = ref(props.friend?.name ?? '')
const name_input = ref<HTMLInputElement | null>(null)
const cadence_amount = ref(props.friend?.cadence_amount ?? DEFAULT_CADENCE_AMOUNT)
const cadence_unit = ref<FriendWriteData['cadence_unit']>(props.friend?.cadence_unit ?? DEFAULT_CADENCE_UNIT)
const is_saving = ref(false)
const error_message = ref('')
const error_field = ref<string | null>(null)
const selected_group_ids = ref<string[]>(props.friend?.groups.map((group) => group.id) ?? [])
const is_group_saving = ref(false)

async function send_friend_for_form(): Promise<void> {
  if (is_saving.value || is_group_saving.value) return
  is_saving.value = true
  error_message.value = ''
  error_field.value = null
  try {
    const friend_data = {
      name: name.value.trim(), cadence_amount: cadence_amount.value,
      cadence_unit: cadence_unit.value, groups: selected_group_ids.value,
    }
    const saved_friend = props.friend
      ? await send_friend_update_for_owner(props.friend.id, friend_data)
      : await send_friend_creation_for_owner(friend_data)
    emit('saved', saved_friend)
  } catch (error) {
    error_field.value = error instanceof ApiError ? error.field : null
    error_message.value = error instanceof ApiError
      ? `${error.message} Revise os dados e tente novamente.`
      : 'Não foi possível salvar o amigo. Seus dados continuam aqui. Tente novamente.'
  } finally {
    is_saving.value = false
  }
}

onMounted(() => { name_input.value?.focus() })
</script>

<template>
  <form class="friend-form paper-surface" :aria-busy="is_saving" @submit.prevent="send_friend_for_form">
    <fieldset class="friend-fields" :disabled="is_saving">
      <legend class="sr-only">Dados do amigo</legend>
      <div class="friend-field">
        <label for="friend-name">Nome</label>
        <input id="friend-name" ref="name_input" v-model="name" class="field" name="name" required maxlength="100" autocomplete="off"
          :aria-invalid="error_field === 'name' ? 'true' : undefined"
          :aria-describedby="error_field === 'name' ? 'friend-name-error' : undefined">
        <p v-if="error_field === 'name'" id="friend-name-error" class="field-error" role="alert">{{ error_message }}</p>
      </div>
      <div class="friend-field">
        <label for="friend-cadence-amount">Falar a cada</label>
        <input id="friend-cadence-amount" v-model.number="cadence_amount" class="field" name="cadence_amount" type="number" min="1" step="1" required
          :aria-invalid="error_field === 'cadence_amount' ? 'true' : undefined"
          :aria-describedby="error_field === 'cadence_amount' ? 'friend-cadence_amount-error' : undefined">
        <p v-if="error_field === 'cadence_amount'" id="friend-cadence_amount-error" class="field-error" role="alert">{{ error_message }}</p>
      </div>
      <fieldset class="cadence-units"
        :aria-invalid="error_field === 'cadence_unit' ? 'true' : undefined"
        :aria-describedby="error_field === 'cadence_unit' ? 'friend-cadence_unit-error' : undefined">
        <legend>Unidade do ritmo</legend>
        <div class="cadence-choices">
          <label v-for="unit in CADENCE_UNITS" :key="unit.value" class="cadence-choice">
            <input v-model="cadence_unit" type="radio" name="cadence_unit" :value="unit.value">
            <span>{{ unit.label }}</span>
          </label>
        </div>
        <p v-if="error_field === 'cadence_unit'" id="friend-cadence_unit-error" class="field-error" role="alert">{{ error_message }}</p>
      </fieldset>
      <div class="friend-groups" :aria-invalid="error_field === 'groups' ? 'true' : undefined"
        :aria-describedby="error_field === 'groups' ? 'friend-groups-error' : undefined">
        <GroupPicker v-model="selected_group_ids" @busy="is_group_saving = $event"
          @updated="emit('group_updated', $event)" @deleted="emit('group_deleted', $event)" />
        <p v-if="error_field === 'groups'" id="friend-groups-error" class="field-error" role="alert">{{ error_message }}</p>
      </div>
    </fieldset>
    <p v-if="error_message && !['name', 'cadence_amount', 'cadence_unit', 'groups'].includes(error_field ?? '')" class="field-error" role="alert">{{ error_message }}</p>
    <button class="save-friend" type="submit" :disabled="is_saving || is_group_saving">{{ is_saving ? 'Salvando…' : 'Salvar amigo' }}</button>
    <button v-if="friend" type="button" name="cancel-friend-edit" class="cancel-edit" :disabled="is_saving || is_group_saving" @click="emit('cancel')">Cancelar edição</button>
  </form>
</template>

<style scoped>
.friend-form { margin-top: var(--notebook-line); padding: 16px; }
.friend-fields, .cadence-units { min-width: 0; margin: 0; padding: 0; border: 0; }
.friend-field { margin-bottom: var(--notebook-line); }
.friend-field > label, .cadence-units > legend { display: block; font-size: .875rem; font-weight: 500; }
.field { box-sizing: border-box; }
.field[type="number"] { appearance: textfield; -moz-appearance: textfield; }
.field[type="number"]::-webkit-inner-spin-button,
.field[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.friend-groups { margin-top: var(--notebook-line); }
.cadence-choices { display: flex; gap: 8px; overflow-x: auto; padding: 4px; }
.cadence-choice { flex-shrink: 0; position: relative; cursor: pointer; }
.cadence-choice input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.cadence-choice span { display: flex; align-items: center; min-height: 44px; padding: 0 12px; border: 1.5px solid var(--ink); border-radius: var(--radius-pill); background: var(--sheet); }
.cadence-choice input:checked + span { background: var(--primary-100); border-color: var(--primary); color: var(--primary-800); font-weight: 600; }
.cadence-choice input:focus-visible + span { box-shadow: var(--focus-ring); }
.cadence-choice:hover span { border-color: var(--primary); }
.field-error { margin: 8px 0 0; color: var(--error); font-size: .875rem; line-height: 1.5; }
.save-friend { width: 100%; min-height: 48px; margin-top: var(--notebook-line); padding: 8px 16px; border: 0; border-radius: var(--radius-pill); background: var(--primary); color: var(--sheet); font-weight: 600; cursor: pointer; }
.save-friend:hover { background: var(--primary-hover); }
.save-friend:active { background: var(--primary-pressed); }
.save-friend:disabled, .friend-fields:disabled { opacity: .45; }
.save-friend:disabled { cursor: wait; }
.cancel-edit { min-height: 44px; margin-top: 8px; padding: 0; border: 0; background: transparent; color: var(--neutral-700); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.cancel-edit:disabled { opacity: .45; cursor: wait; }
</style>
