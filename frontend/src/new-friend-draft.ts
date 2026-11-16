import { reactive } from 'vue'
import type { FriendGroup, FriendWriteData } from './api/friends'

export const DEFAULT_FRIEND_CADENCE_AMOUNT = 1
export const DEFAULT_FRIEND_CADENCE_UNIT = 'month'

export const new_friend_draft = reactive({
  name: '', cadence_amount: DEFAULT_FRIEND_CADENCE_AMOUNT, cadence_unit: DEFAULT_FRIEND_CADENCE_UNIT as FriendWriteData['cadence_unit'],
  phone: '', birthday: '', groups: [] as FriendGroup[],
})

export function clear_new_friend_draft(): void {
  Object.assign(new_friend_draft, { name: '', phone: '', cadence_amount: DEFAULT_FRIEND_CADENCE_AMOUNT, cadence_unit: DEFAULT_FRIEND_CADENCE_UNIT, birthday: '', groups: [] })
}
