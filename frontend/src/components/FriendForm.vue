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
        <input id="friend-cadence-amount" v-model.number="cadence_amount" class="field" name="cadence_amount" type="number" inputmode="numeric" min="1" step="1" required
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
    <button class="save-friend" type="submit" :aria-busy="is_saving" :disabled="is_saving || is_group_saving">{{ is_saving ? 'Salvando…' : 'Salvar amigo' }}</button>
    <button v-if="friend" type="button" name="cancel-friend-edit" class="cancel-edit" :disabled="is_saving || is_group_saving" @click="emit('cancel')">Cancelar edição</button>
  </form>
</template>

<style scoped>
.friend-form{margin-top:var(--notebook-line);padding:0;background:none;border:0;border-radius:0;box-shadow:none;
 display:flex;flex-wrap:wrap;align-items:flex-start;column-gap:1rem}
.friend-fields,.cadence-units{min-width:0;margin:0;padding:0;border:0}
.friend-fields{flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:flex-start;column-gap:1.5rem}
.friend-field{flex:1 1 100%;min-width:0;margin:0 0 var(--notebook-line)}

.friend-field>label{display:block;padding:0;font:700 1.375rem/var(--notebook-line) var(--font-handwriting);color:var(--pen-ink)}

.field{position:relative;z-index:1;display:block;width:100%;height:3rem;margin-top:-1rem;padding:1rem .25rem 0;border:0;border-radius:0;
 font:400 1rem/var(--notebook-line) var(--font-ui);color:var(--ink);-webkit-appearance:none;appearance:none;
 background:linear-gradient(var(--neutral-500),var(--neutral-500)) no-repeat 0 calc(100% - .3125rem)/100% 1.5px;transition:background-color var(--duration-fast)}

.field:focus{outline:none;box-shadow:none;
 background:linear-gradient(var(--focus),var(--focus)) no-repeat 0 calc(100% - .25rem)/100% 3px,
            linear-gradient(var(--highlight-50),var(--highlight-50)) no-repeat 0 calc(100% - .3125rem)/100% 1.6875rem}

.field[aria-invalid="true"]{background:linear-gradient(var(--error),var(--error)) no-repeat 0 calc(100% - .25rem)/100% 2.5px}
.field[aria-invalid="true"]:focus{background:linear-gradient(var(--error),var(--error)) no-repeat 0 calc(100% - .25rem)/100% 3px,
            linear-gradient(var(--highlight-50),var(--highlight-50)) no-repeat 0 calc(100% - .3125rem)/100% 1.6875rem}
.field[type="number"]{-moz-appearance:textfield;appearance:textfield}
.field[type="number"]::-webkit-inner-spin-button,.field[type="number"]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}

.friend-field:has(>[name="cadence_amount"]){flex:0 1 auto;display:flex;flex-wrap:wrap;align-items:flex-start;column-gap:.75rem;margin-bottom:0}
.friend-field>[name="cadence_amount"]{flex:none;width:4rem;text-align:center;font-variant-numeric:tabular-nums}
.friend-field:has(>[name="cadence_amount"])>.field-error{flex:1 1 100%}
.cadence-units{position:relative;flex:0 1 auto}
.cadence-units>legend{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}

.cadence-choices{display:flex;flex-wrap:wrap;width:fit-content;max-width:100%;column-gap:.25rem;row-gap:1rem;margin:0 0 -1rem;padding:0;overflow:visible}
.cadence-choice{position:relative;flex:none;display:flex;justify-content:center;min-width:2.75rem;height:3rem;padding:0 .5rem 1rem;cursor:pointer}
.cadence-choice input{position:absolute;width:1px;height:1px;margin:0;opacity:0}
.cadence-choice span{position:relative;display:flex;align-items:center;height:var(--notebook-line);min-height:0;padding:0;border:0;border-radius:0;background:none;
 font:400 1rem/var(--notebook-line) var(--font-ui);color:var(--ink);text-transform:lowercase;white-space:nowrap}
.cadence-choice input:checked+span{background:none;color:var(--ink);font-weight:600}
.cadence-choice input:checked+span::before{content:"";position:absolute;inset:-.0625rem -.5rem 0;border:2px solid var(--pen-ink);border-radius:50% 46% 52% 44%/60% 50% 55% 45%;transform:rotate(-2deg)}
.cadence-choice:hover span{color:var(--pen-ink)}
.cadence-choice input:focus-visible+span{box-shadow:var(--focus-ring);border-radius:4px}
.cadence-units[aria-invalid="true"] .cadence-choices{background:linear-gradient(var(--error),var(--error)) no-repeat 0 calc(100% - 1.25rem)/100% 2.5px}

.field-error{display:flex;gap:.375rem;margin:0;font:400 .875rem/var(--notebook-line) var(--font-ui);color:var(--error);pointer-events:none}
.field-error::before{content:"!";flex:none;display:grid;place-items:center;width:1rem;height:1rem;margin-top:.5rem;border-radius:50%;background:var(--error);color:var(--sheet);font:700 .6875rem/1 var(--font-ui)}
.friend-form>.field-error{flex:1 1 100%;margin-top:var(--notebook-line)}

.save-friend{display:inline-flex;align-items:center;justify-content:center;text-align:center;width:auto;max-width:100%;min-height:3rem;
 margin:calc(var(--notebook-line) + 1rem) 0 0;padding:.5rem 1.375rem;border:0;border-radius:var(--radius-sm);cursor:pointer;
 background:var(--primary);color:var(--sheet);font:700 1.625rem/var(--notebook-line) var(--font-handwriting);letter-spacing:.01em;transform:rotate(-2deg);
 box-shadow:inset 0 0 0 3px var(--primary),inset 0 0 0 4.5px color-mix(in srgb, var(--sheet) 80%, transparent);transition:background-color var(--duration-fast)}
.save-friend:hover{background:var(--primary-hover);box-shadow:inset 0 0 0 3px var(--primary-hover),inset 0 0 0 4.5px color-mix(in srgb, var(--sheet) 80%, transparent)}
.save-friend:active{background:var(--primary-pressed);box-shadow:inset 0 0 0 3px var(--primary-pressed),inset 0 0 0 4.5px color-mix(in srgb, var(--sheet) 80%, transparent);transform:rotate(-2deg) scale(.97)}
.save-friend:focus-visible{box-shadow:inset 0 0 0 3px var(--primary),inset 0 0 0 4.5px color-mix(in srgb, var(--sheet) 80%, transparent),var(--focus-ring)}
.cancel-edit{display:inline-flex;align-items:center;min-height:3rem;margin:calc(var(--notebook-line) + 1rem) 0 0;padding:.5rem 0;border:0;background:transparent;cursor:pointer;
 font:500 .9375rem/var(--notebook-line) var(--font-ui);color:var(--neutral-700);text-decoration:underline;text-underline-offset:3px}

.friend-fields:disabled{opacity:.45}
.save-friend:disabled{opacity:.6;cursor:wait}
.cancel-edit:disabled{opacity:.45;cursor:wait}

.friend-groups{flex:1 1 100%;min-width:0;margin-top:var(--notebook-line)}
</style>
