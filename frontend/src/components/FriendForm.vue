<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { send_friend_creation_for_owner, send_friend_update_for_owner } from '../api/friends'
import type { BoardFriend, FriendGroup, FriendWriteData } from '../api/friends'
import { ApiError } from '../api/http'
import { DEFAULT_FRIEND_CADENCE_AMOUNT, DEFAULT_FRIEND_CADENCE_UNIT, clear_new_friend_draft, new_friend_draft } from '../new-friend-draft'
import { format_phone_for_display, get_normalized_phone_for_friend, INVALID_PHONE_MESSAGE, MAX_PHONE_INPUT_LENGTH } from '../phone'
import GroupPicker from './GroupPicker.vue'

const PHONE_CONFLICT_STATUS = 409
const BIRTHDAY_DAY_DIGITS = 2
const BIRTHDAY_MAX_DIGITS = 4
const BIRTHDAY_MAX_LENGTH = 5
const CADENCE_UNITS = [
  { value: 'day', label: 'Dias' },
  { value: 'week', label: 'Semanas' },
  { value: 'month', label: 'Meses' },
  { value: 'year', label: 'Anos' },
] as const
const props = defineProps<{ friend?: BoardFriend; initial_values?: FriendWriteData; submit_label?: string; phone_options?: string[] }>()
const emit = defineEmits<{
  saved: [friend: BoardFriend]
  cancel: []
  group_updated: [group: FriendGroup]
  group_deleted: [group_id: string]
  draft_changed: [draft: FriendWriteData]
  busy: [is_busy: boolean]
  phone_conflict: []
}>()
const name = ref(props.friend?.name ?? props.initial_values?.name ?? '')
const name_input = ref<HTMLInputElement | null>(null)
const phone = ref(props.friend?.phone ?? props.initial_values?.phone ?? '')
const phone_input = ref<HTMLInputElement | null>(null)
const birthday = ref(props.friend?.birthday ?? props.initial_values?.birthday ?? '')
const birthday_input = ref<HTMLInputElement | null>(null)
const cadence_amount = ref(props.friend?.cadence_amount ?? props.initial_values?.cadence_amount ?? DEFAULT_FRIEND_CADENCE_AMOUNT)
const cadence_unit = ref<FriendWriteData['cadence_unit']>(props.friend?.cadence_unit ?? props.initial_values?.cadence_unit ?? DEFAULT_FRIEND_CADENCE_UNIT)
const is_saving = ref(false)
const error_message = ref('')
const error_field = ref<string | null>(null)
const selected_group_ids = ref<string[]>(props.friend?.groups.map((group) => group.id) ?? props.initial_values?.groups ?? [])
const is_group_saving = ref(false)
const selected_groups = ref<FriendGroup[]>([])

watchEffect(() => {
  if (props.friend) return
  Object.assign(new_friend_draft, {
    name: name.value, phone: phone.value, cadence_amount: cadence_amount.value, cadence_unit: cadence_unit.value,
    birthday: birthday.value, groups: selected_groups.value,
  })
  emit('draft_changed', {
    name: name.value, phone: phone.value, birthday: birthday.value,
    cadence_amount: cadence_amount.value, cadence_unit: cadence_unit.value, groups: selected_group_ids.value,
  })
})
watchEffect(() => emit('busy', is_saving.value || is_group_saving.value))
watch(phone, () => {
  if (error_field.value === 'phone') { error_field.value = null; error_message.value = '' }
})
onBeforeUnmount(() => { if (!props.friend) clear_new_friend_draft() })

/** Format digits without validating dates; deletion must not reinsert the slash. */
function set_birthday_for_form(event: Event): void {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  const digits = input.value.replace(/\D/g, '').slice(0, BIRTHDAY_MAX_DIGITS)
  const is_deleting = event instanceof InputEvent && event.inputType.startsWith('delete')
  birthday.value = digits.length > BIRTHDAY_DAY_DIGITS
    ? `${digits.slice(0, BIRTHDAY_DAY_DIGITS)}/${digits.slice(BIRTHDAY_DAY_DIGITS)}`
    : digits.length === BIRTHDAY_DAY_DIGITS && !is_deleting ? `${digits}/` : digits
  input.value = birthday.value
  if (!birthday.value) clear_birthday_for_form()
}

/** Clear the date and its API error, returning keyboard focus to the input. */
function clear_birthday_for_form(): void {
  birthday.value = ''
  if (error_field.value === 'birthday') {
    error_field.value = null
    error_message.value = ''
  }
  birthday_input.value?.focus()
}

async function send_friend_for_form(should_use_defaults = false): Promise<void> {
  if (is_saving.value || is_group_saving.value) return
  error_message.value = ''
  error_field.value = null
  if (!name.value.trim()) {
    error_field.value = 'name'
    error_message.value = 'Escreva pelo menos um nome pra gente guardar.'
    name_input.value?.focus()
    return
  }
  let normalized_phone: string | null
  try {
    normalized_phone = get_normalized_phone_for_friend(phone.value)
  } catch {
    error_field.value = 'phone'
    error_message.value = INVALID_PHONE_MESSAGE
    phone_input.value?.focus()
    return
  }
  is_saving.value = true
  try {
    // Approved CRM-30 deviation: skipping keeps edited personal data; only cadence/groups reset.
    const friend_data = {
      name: name.value.trim(), cadence_amount: should_use_defaults ? DEFAULT_FRIEND_CADENCE_AMOUNT : cadence_amount.value,
      cadence_unit: should_use_defaults ? DEFAULT_FRIEND_CADENCE_UNIT : cadence_unit.value,
      groups: should_use_defaults ? [] : selected_group_ids.value,
      birthday: birthday.value || null,
      phone: normalized_phone,
    }
    const saved_friend = props.friend
      ? await send_friend_update_for_owner(props.friend.id, friend_data)
      : await send_friend_creation_for_owner(friend_data)
    emit('saved', saved_friend)
  } catch (error) {
    if (error instanceof ApiError && error.status === PHONE_CONFLICT_STATUS) emit('phone_conflict')
    error_field.value = error instanceof ApiError ? error.field : null
    error_message.value = error instanceof ApiError
      ? ['birthday', 'phone'].includes(error.field ?? '') ? error.message : `${error.message} Revise os dados e tente novamente.`
      : 'Não foi possível confirmar o salvamento. Seus dados continuam aqui. Confira a lista antes de tentar novamente.'
  } finally {
    is_saving.value = false
  }
}

onMounted(() => { name_input.value?.focus() })
</script>

<template>
  <form class="friend-form paper-surface" :class="{ 'is-prefilled': initial_values }" :aria-busy="is_saving" @submit.prevent="send_friend_for_form()">
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
        <label for="friend-phone">Telefone (opcional)</label>
        <input id="friend-phone" ref="phone_input" v-model="phone" class="field" name="phone" type="tel" autocomplete="tel"
          :maxlength="MAX_PHONE_INPUT_LENGTH"
          :aria-invalid="error_field === 'phone' ? 'true' : undefined"
          :aria-describedby="error_field === 'phone' ? 'friend-phone-error' : undefined">
        <p v-if="error_field === 'phone'" id="friend-phone-error" class="field-error" role="alert">{{ error_message }}</p>
        <fieldset v-if="phone_options && phone_options.length > 1" class="phone-options">
          <legend>Qual número</legend>
          <label v-for="option in phone_options" :key="option">
            <input v-model="phone" type="radio" name="phone_choice" :value="option">
            <span>{{ format_phone_for_display(option) }}</span>
          </label>
        </fieldset>
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
      <div class="friend-field">
        <label for="friend-birthday">Aniversário (dia/mês, opcional)</label>
        <input id="friend-birthday" ref="birthday_input" :value="birthday" class="field" name="birthday" type="text"
          inputmode="numeric" :maxlength="BIRTHDAY_MAX_LENGTH" placeholder="dd/mm" autocomplete="off"
          :aria-invalid="error_field === 'birthday' ? 'true' : undefined"
          :aria-describedby="error_field === 'birthday' ? 'friend-birthday-error' : undefined"
          @input="set_birthday_for_form">
        <button v-if="birthday" type="button" class="clear-birthday" aria-label="Apagar aniversário" @click="clear_birthday_for_form">apagar</button>
        <p v-if="error_field === 'birthday'" id="friend-birthday-error" class="field-error" role="alert">{{ error_message }}</p>
      </div>
      <div class="friend-groups" :aria-invalid="error_field === 'groups' ? 'true' : undefined"
        :aria-describedby="error_field === 'groups' ? 'friend-groups-error' : undefined">
        <GroupPicker v-model="selected_group_ids" :should_suggest_groups="!friend" @busy="is_group_saving = $event" @selection_changed="selected_groups = $event"
          @updated="emit('group_updated', $event)" @deleted="emit('group_deleted', $event)" />
        <p v-if="error_field === 'groups'" id="friend-groups-error" class="field-error" role="alert">{{ error_message }}</p>
      </div>
    </fieldset>
    <p v-if="error_message && !['name', 'phone', 'cadence_amount', 'cadence_unit', 'birthday', 'groups'].includes(error_field ?? '')" class="field-error" role="alert">{{ error_message }}</p>
    <div class="friend-form-actions">
      <slot name="before-submit" :is_busy="is_saving || is_group_saving" :save_with_defaults="() => send_friend_for_form(true)" />
      <button class="save-friend stamp-filled" type="submit" :aria-busy="is_saving" :disabled="is_saving || is_group_saving">{{ is_saving ? 'Salvando…' : submit_label ?? 'Salvar amigo' }}</button>
      <slot name="after-submit" :is_busy="is_saving || is_group_saving" />
      <button v-if="friend" type="button" name="cancel-friend-edit" class="cancel-edit" :disabled="is_saving || is_group_saving" @click="emit('cancel')">Cancelar edição</button>
    </div>
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
.friend-field:has(>[name="birthday"]){display:flex;flex-wrap:wrap;align-items:flex-start;column-gap:1rem;margin:var(--notebook-line) 0 0}
.friend-field:has(>[name="birthday"])>label,.friend-field:has(>[name="birthday"])>.field-error{flex:1 1 100%}
.friend-field>[name="birthday"]{flex:none;width:6rem;font-variant-numeric:tabular-nums;letter-spacing:.04em}
.field::placeholder{color:var(--neutral-600);opacity:1}
.field[type="tel"]{font-variant-numeric:tabular-nums}
.clear-birthday{flex:none;min-width:2.75rem;height:3rem;margin:-1rem 0 0;padding:1rem .25rem 0;border:0;background:none;cursor:pointer;
 font:500 .875rem/var(--notebook-line) var(--font-ui);color:var(--neutral-700);text-decoration:underline;text-underline-offset:3px}
.clear-birthday:hover{color:var(--ink)}
.clear-birthday:focus-visible{box-shadow:var(--focus-ring);border-radius:4px}
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

.friend-form-actions{display:flex;flex-wrap:wrap;align-items:center;gap:1rem;margin:calc(var(--notebook-line) + 1rem) 0 0}
/* CRM-30 mobile feedback: keep actions after the fields so they cannot cover them. */
.is-prefilled .friend-form-actions{flex:1 1 100%;justify-content:space-between;
 gap:.5rem;padding:.5rem 0 calc(.5rem + env(safe-area-inset-bottom))}
.is-prefilled .save-friend{font-size:1.5rem;padding-inline:1rem}
.phone-options{border:0;margin:var(--notebook-line) 0 0;padding:0;min-width:0}
.phone-options legend{font:500 .875rem/var(--notebook-line) var(--font-ui);color:var(--neutral-700)}
.phone-options label{display:flex;align-items:center;gap:.5rem;min-height:2.75rem;font:400 1rem/var(--notebook-line) var(--font-ui);cursor:pointer}
.phone-options input{accent-color:var(--primary);flex:none;width:1.125rem;height:1.125rem}
.phone-options span{overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.cancel-edit{display:inline-flex;align-items:center;min-height:3rem;margin:0;padding:.5rem 0;border:0;background:transparent;cursor:pointer;
 font:500 .9375rem/var(--notebook-line) var(--font-ui);color:var(--neutral-700);text-decoration:underline;text-underline-offset:3px}

.friend-fields:disabled{opacity:.45}
.save-friend:disabled{opacity:.6;cursor:wait}
.cancel-edit:disabled{opacity:.45;cursor:wait}

.friend-groups{flex:1 1 100%;min-width:0;margin-top:var(--notebook-line)}
</style>
