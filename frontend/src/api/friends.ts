import { send_api_request } from './http'

const BOARD_COLUMNS = ['overdue', 'this_week', 'on_track', 'just_talked'] as const
const CADENCE_UNITS = ['day', 'week', 'month', 'year'] as const
const GROUP_COLORS = ['family', 'college', 'work', 'neighborhood', 'neutral'] as const
const CONTACT_KINDS = ['message', 'call', 'meeting'] as const

export interface FriendGroup {
  id: string
  name: string
  color: typeof GROUP_COLORS[number]
}

/** Group management also needs the saved friend count shown before deletion. */
export interface GroupWithFriendCount extends FriendGroup {
  friends_count: number
}

/** Read contract exposed by Django's BoardFriendSerializer. UUIDs arrive as strings. */
export interface BoardFriend {
  id: string
  name: string
  cadence_amount: number
  cadence_unit: typeof CADENCE_UNITS[number]
  birthday: string | null
  is_birthday_today: boolean
  column: typeof BOARD_COLUMNS[number]
  last_contact_at: string | null
  last_note: string | null
  groups: FriendGroup[]
}

/** Input accepted by Django's FriendWriteSerializer; owner comes from the session. */
export interface FriendWriteData {
  name: string
  cadence_amount: number
  cadence_unit: BoardFriend['cadence_unit']
  birthday?: string | null
  groups?: string[]
}

/** Input accepted by Django's ContactWriteSerializer; the server sets the date. */
export interface ContactWriteData {
  kind: typeof CONTACT_KINDS[number]
  note: string
}

/** ContactReadSerializer fields; the recording date always comes from Django. */
export interface FriendContact extends ContactWriteData {
  id: string
  date: string
}

/** The continuation token is opaque; null means the history has no next page. */
export interface FriendContactPage {
  next: string | null
  results: FriendContact[]
}

/** Updated friend, the saved history item, and the ID used by the board's undo. */
export interface RecordedContact extends BoardFriend {
  contact_id: string
  contact: FriendContact
}

function is_friend_contact(body: unknown): body is FriendContact {
  return typeof body === 'object' && body !== null
    && 'id' in body && typeof body.id === 'string'
    && 'kind' in body && CONTACT_KINDS.some((kind) => kind === body.kind)
    && 'date' in body && typeof body.date === 'string' && Number.isFinite(Date.parse(body.date))
    && 'note' in body && typeof body.note === 'string'
}

function is_friend_group(body: unknown): body is FriendGroup {
  return typeof body === 'object' && body !== null
    && 'id' in body && typeof body.id === 'string'
    && 'name' in body && typeof body.name === 'string'
    && 'color' in body && GROUP_COLORS.some((color) => color === body.color)
}

function is_group_with_friend_count(body: unknown): body is GroupWithFriendCount {
  return is_friend_group(body) && 'friends_count' in body
    && typeof body.friends_count === 'number'
    && Number.isInteger(body.friends_count) && body.friends_count >= 0
}

function is_board_friend(body: unknown): body is BoardFriend {
  return typeof body === 'object' && body !== null
    && 'id' in body && typeof body.id === 'string'
    && 'name' in body && typeof body.name === 'string'
    && 'cadence_amount' in body && typeof body.cadence_amount === 'number'
    && Number.isInteger(body.cadence_amount) && body.cadence_amount > 0
    && 'cadence_unit' in body && CADENCE_UNITS.some((unit) => unit === body.cadence_unit)
    && 'birthday' in body && (body.birthday === null || typeof body.birthday === 'string')
    && 'is_birthday_today' in body && typeof body.is_birthday_today === 'boolean'
    && 'column' in body && BOARD_COLUMNS.some((column) => column === body.column)
    && 'last_contact_at' in body && (body.last_contact_at === null || typeof body.last_contact_at === 'string')
    && 'last_note' in body && (body.last_note === null || typeof body.last_note === 'string')
    && 'groups' in body && Array.isArray(body.groups) && body.groups.every(is_friend_group)
}

/** Fetch the owner's friends without changing the order calculated by Django. */
export async function get_friends_for_board(): Promise<BoardFriend[]> {
  const body = await send_api_request('/api/friends/')
  if (!Array.isArray(body) || !body.every(is_board_friend)) {
    throw new Error('Invalid board friends response')
  }
  return body
}

/** Fetch one owned friend with its latest board fields calculated by Django. */
export async function get_friend_for_board(friend_id: string): Promise<BoardFriend> {
  const body = await send_api_request(`/api/friends/${friend_id}/`)
  if (!is_board_friend(body)) throw new Error('Invalid board friend response')
  return body
}

/** Create an owned friend and return the board fields calculated by Django. */
export async function send_friend_creation_for_owner(friend: FriendWriteData): Promise<BoardFriend> {
  const body = await send_api_request('/api/friends/', { method: 'POST', body: friend })
  if (!is_board_friend(body)) throw new Error('Invalid board friend response')
  return body
}

/** Update supplied fields only; omitted groups retain links and an empty list clears them. */
export async function send_friend_update_for_owner(friend_id: string, friend: Partial<FriendWriteData>): Promise<BoardFriend> {
  const body = await send_api_request(`/api/friends/${friend_id}/`, { method: 'PATCH', body: friend })
  if (!is_board_friend(body)) throw new Error('Invalid board friend response')
  return body
}

/** Delete an owned friend and its contacts; Django keeps the groups and returns 204. */
export async function send_friend_deletion_for_owner(friend_id: string): Promise<void> {
  await send_api_request(`/api/friends/${friend_id}/`, { method: 'DELETE' })
}

/** Read history in Django's order, returning the next cursor unchanged. */
export async function get_contacts_for_friend(friend_id: string, cursor: string | null = null): Promise<FriendContactPage> {
  const query = cursor === null ? '' : `?${new URLSearchParams({ cursor })}`
  const body = await send_api_request(`/api/friends/${friend_id}/contacts/${query}`)
  if (typeof body !== 'object' || body === null
    || !('next' in body) || (body.next !== null && typeof body.next !== 'string')
    || !('results' in body) || !Array.isArray(body.results) || !body.results.every(is_friend_contact)) {
    throw new Error('Invalid contact history response')
  }
  return { next: body.next, results: body.results }
}

/** Validate the saved history item alongside the friend and ID used by undo. */
export async function send_contact_for_friend(friend_id: string, contact: ContactWriteData): Promise<RecordedContact> {
  const body = await send_api_request(`/api/friends/${friend_id}/contacts/`, {
    method: 'POST', body: contact,
  })
  if (!is_board_friend(body) || !('contact_id' in body) || typeof body.contact_id !== 'string'
    || !('contact' in body) || !is_friend_contact(body.contact)) {
    throw new Error('Invalid recorded contact response')
  }
  return { ...body, contact_id: body.contact_id, contact: body.contact }
}

/** Delete one owned contact. Django returns 204; refresh the friend separately. */
export async function send_contact_deletion_for_friend(friend_id: string, contact_id: string): Promise<void> {
  await send_api_request(`/api/friends/${friend_id}/contacts/${contact_id}/`, { method: 'DELETE' })
}

/** Fetch all owned groups, including unused groups, in the order supplied by Django. */
export async function get_groups_for_board(): Promise<FriendGroup[]> {
  const body = await send_api_request('/api/groups/')
  if (!Array.isArray(body) || !body.every(is_friend_group)) {
    throw new Error('Invalid board groups response')
  }
  return body
}

/** Create an owned group; the friend form selects it only after Django confirms it. */
export async function send_group_creation_for_owner(group: Pick<FriendGroup, 'name' | 'color'>): Promise<GroupWithFriendCount> {
  const body = await send_api_request('/api/groups/', { method: 'POST', body: group })
  if (!is_group_with_friend_count(body)) throw new Error('Invalid group response')
  return body
}

/** Read the same group list as the board, checking counts needed by deletion confirmation. */
export async function get_groups_for_form(): Promise<GroupWithFriendCount[]> {
  const groups = await get_groups_for_board()
  if (!groups.every(is_group_with_friend_count)) throw new Error('Invalid group counts response')
  return groups
}

/** Update an owned group's name or color and return its current friend count. */
export async function send_group_update_for_owner(group_id: string, group: Partial<Pick<FriendGroup, 'name' | 'color'>>): Promise<GroupWithFriendCount> {
  const body = await send_api_request(`/api/groups/${group_id}/`, { method: 'PATCH', body: group })
  if (!is_group_with_friend_count(body)) throw new Error('Invalid group response')
  return body
}

/** Delete a group and its links; Django keeps the friends and returns an empty 204. */
export async function send_group_deletion_for_owner(group_id: string): Promise<void> {
  await send_api_request(`/api/groups/${group_id}/`, { method: 'DELETE' })
}
