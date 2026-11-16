import { computed, reactive } from 'vue'
import type { BoardFriend, FriendImportResult, FriendWriteData } from './api/friends'
import type { AgendaContact, AgendaImportResult } from './agenda'
import { DEFAULT_FRIEND_CADENCE_AMOUNT, DEFAULT_FRIEND_CADENCE_UNIT } from './new-friend-draft'
import { add_friends_for_list } from './friends'

interface IgnoredAgendaContact {
  name: string
  friend_id: string
}

export enum AgendaImportStep {
  FILE = 'file',
  READING = 'reading',
  SELECT = 'select',
  COMPLETE = 'complete',
  DONE = 'done',
}

/** Shared only by the two notebook pages; cleared when the import route exits. */
export const agenda_import_state = reactive({
  step: AgendaImportStep.FILE,
  contacts: [] as AgendaContact[],
  selected_ids: new Set<string>(),
  saved_contact_ids: new Set<string>(),
  existing_friends: [] as BoardFriend[],
  saved_friends: [] as BoardFriend[],
  ignored_contacts: [] as IgnoredAgendaContact[],
  drafts: {} as Record<string, FriendWriteData>,
  queue_ids: [] as string[],
  queue_index: 0,
  skipped_without_name: 0,
  ignored_existing_count: 0,
  is_busy: false,
})

const existing_friends_by_phone = computed(() => new Map(
  agenda_import_state.existing_friends.flatMap((friend) => friend.phone ? [[friend.phone, friend] as const] : []),
))

export const selected_agenda_contacts = computed(() => agenda_import_state.contacts.filter((contact) =>
  agenda_import_state.selected_ids.has(contact.id) && !agenda_import_state.saved_contact_ids.has(contact.id)
  && !get_duplicate_friend_for_agenda_contact(contact),
))
export const current_agenda_contact = computed(() => {
  const id = agenda_import_state.queue_ids[agenda_import_state.queue_index]
  return agenda_import_state.contacts.find((contact) => contact.id === id)
})
export const remaining_agenda_contacts = computed(() => {
  const contacts_by_id = new Map(agenda_import_state.contacts.map((contact) => [contact.id, contact]))
  return agenda_import_state.queue_ids.slice(agenda_import_state.queue_index).map((id) => contacts_by_id.get(id)).filter((contact) => contact !== undefined)
})
const selected_contacts_by_phone = computed(() => new Map(
  selected_agenda_contacts.value.flatMap((contact) => contact.phone ? [[contact.phone, contact] as const] : []),
))

export function get_duplicate_friend_for_agenda_contact(contact: Pick<AgendaContact, 'phone'>): BoardFriend | undefined {
  return contact.phone ? existing_friends_by_phone.value.get(contact.phone) : undefined
}

export function get_duplicate_selected_agenda_contact(contact: AgendaContact): AgendaContact | undefined {
  const selected = contact.phone ? selected_contacts_by_phone.value.get(contact.phone) : undefined
  return selected?.id !== contact.id ? selected : undefined
}

export function set_agenda_contact_selection(contact: AgendaContact, is_selected: boolean): void {
  if (!is_selected) { agenda_import_state.selected_ids.delete(contact.id); return }
  if (agenda_import_state.saved_contact_ids.has(contact.id) || get_duplicate_friend_for_agenda_contact(contact)
    || get_duplicate_selected_agenda_contact(contact)) return
  agenda_import_state.selected_ids.add(contact.id)
}

/** Keep the other selection when switching this row to an already selected number. */
export function set_phone_for_agenda_contact(contact: AgendaContact, phone: string): void {
  if (!contact.phones.some((alternative) => alternative.number === phone)) return
  const other_selected = selected_contacts_by_phone.value.get(phone)
  contact.phone = phone
  if (get_duplicate_friend_for_agenda_contact(contact) || (other_selected && other_selected.id !== contact.id)) {
    agenda_import_state.selected_ids.delete(contact.id)
  }
  if (agenda_import_state.drafts[contact.id]) agenda_import_state.drafts[contact.id]!.phone = phone
}

/** Android's native picker already performed selection; file imports start unselected. */
export function set_agenda_for_import(result: AgendaImportResult, is_from_picker = false): void {
  agenda_import_state.contacts = result.contacts
  agenda_import_state.skipped_without_name = result.skipped_without_name
  agenda_import_state.selected_ids.clear()
  agenda_import_state.saved_contact_ids.clear()
  agenda_import_state.drafts = {}
  agenda_import_state.queue_ids = []
  agenda_import_state.queue_index = 0
  agenda_import_state.ignored_existing_count = 0
  agenda_import_state.step = AgendaImportStep.SELECT
  if (is_from_picker) {
    for (const contact of result.contacts) {
      if (get_duplicate_friend_for_agenda_contact(contact)) agenda_import_state.ignored_existing_count += contact.source_count
      else set_agenda_contact_selection(contact, true)
    }
    if (selected_agenda_contacts.value.length) start_completing_agenda_contacts()
    else agenda_import_state.step = AgendaImportStep.DONE
  }
}

export function start_completing_agenda_contacts(): void {
  if (agenda_import_state.is_busy || !selected_agenda_contacts.value.length) return
  agenda_import_state.queue_ids = selected_agenda_contacts.value.map((contact) => contact.id)
  agenda_import_state.queue_index = 0
  agenda_import_state.step = AgendaImportStep.COMPLETE
}

/** Retain raw edits in memory, including an incomplete birthday or invalid phone. */
export function get_draft_for_agenda_contact(contact: AgendaContact): FriendWriteData {
  return agenda_import_state.drafts[contact.id] ?? {
    name: contact.name, phone: contact.phone, birthday: contact.birthday,
    cadence_amount: DEFAULT_FRIEND_CADENCE_AMOUNT, cadence_unit: DEFAULT_FRIEND_CADENCE_UNIT, groups: [],
  }
}

export function set_saved_friend_for_agenda(contact: AgendaContact, friend: BoardFriend): void {
  agenda_import_state.is_busy = false
  agenda_import_state.saved_friends.push(friend)
  add_friends_for_list([friend])
  agenda_import_state.existing_friends.push(friend)
  agenda_import_state.saved_contact_ids.add(contact.id)
  agenda_import_state.selected_ids.delete(contact.id)
  agenda_import_state.queue_index += 1
  if (agenda_import_state.queue_index >= agenda_import_state.queue_ids.length) agenda_import_state.step = AgendaImportStep.DONE
}

/** Apply only a complete, validated API response; skipped contacts cannot be reselected. */
export function set_import_result_for_agenda(contacts: AgendaContact[], result: FriendImportResult): void {
  const created_friends = result.created.map((entry) => entry.friend)
  agenda_import_state.saved_friends.push(...created_friends)
  agenda_import_state.existing_friends.push(...created_friends)
  add_friends_for_list(created_friends)
  for (const entry of result.ignored) {
    const contact = contacts[entry.index]!
    agenda_import_state.ignored_contacts.push({ name: get_draft_for_agenda_contact(contact).name, friend_id: entry.friend_id })
  }
  for (const contact of contacts) {
    agenda_import_state.saved_contact_ids.add(contact.id)
    agenda_import_state.selected_ids.delete(contact.id)
  }
  agenda_import_state.is_busy = false
  agenda_import_state.step = AgendaImportStep.DONE
}

export function clear_agenda_import(): void {
  Object.assign(agenda_import_state, {
    step: AgendaImportStep.FILE, contacts: [], selected_ids: new Set<string>(), saved_contact_ids: new Set<string>(),
    existing_friends: [], saved_friends: [], ignored_contacts: [], drafts: {}, queue_ids: [], queue_index: 0,
    skipped_without_name: 0, ignored_existing_count: 0, is_busy: false,
  })
}
