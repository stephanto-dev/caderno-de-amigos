import { send_api_request } from './http'

const BOARD_COLUMNS = ['overdue', 'this_week', 'on_track', 'just_talked'] as const
const CADENCE_UNITS = ['day', 'week', 'month', 'year'] as const
const GROUP_COLORS = ['family', 'college', 'work', 'neighborhood', 'neutral'] as const

export interface FriendGroup {
  id: string
  name: string
  color: typeof GROUP_COLORS[number]
}

/** Read contract exposed by Django's BoardFriendSerializer. UUIDs arrive as strings. */
export interface BoardFriend {
  id: string
  name: string
  cadence_amount: number
  cadence_unit: typeof CADENCE_UNITS[number]
  column: typeof BOARD_COLUMNS[number]
  last_contact_at: string | null
  last_note: string | null
  groups: FriendGroup[]
}

function is_friend_group(body: unknown): body is FriendGroup {
  return typeof body === 'object' && body !== null
    && 'id' in body && typeof body.id === 'string'
    && 'name' in body && typeof body.name === 'string'
    && 'color' in body && GROUP_COLORS.some((color) => color === body.color)
}

function is_board_friend(body: unknown): body is BoardFriend {
  return typeof body === 'object' && body !== null
    && 'id' in body && typeof body.id === 'string'
    && 'name' in body && typeof body.name === 'string'
    && 'cadence_amount' in body && typeof body.cadence_amount === 'number'
    && Number.isInteger(body.cadence_amount) && body.cadence_amount > 0
    && 'cadence_unit' in body && CADENCE_UNITS.some((unit) => unit === body.cadence_unit)
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

/** Fetch all owned groups, including unused groups, in the order supplied by Django. */
export async function get_groups_for_board(): Promise<FriendGroup[]> {
  const body = await send_api_request('/api/groups/')
  if (!Array.isArray(body) || !body.every(is_friend_group)) {
    throw new Error('Invalid board groups response')
  }
  return body
}
