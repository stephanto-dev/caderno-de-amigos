import { reactive } from 'vue'
import type { FriendGroup, FriendWriteData } from './api/friends'

export const new_friend_draft = reactive({
  name: '', cadence_amount: 1, cadence_unit: 'month' as FriendWriteData['cadence_unit'],
  birthday: '', groups: [] as FriendGroup[],
})

export function clear_new_friend_draft(): void {
  Object.assign(new_friend_draft, { name: '', cadence_amount: 1, cadence_unit: 'month', birthday: '', groups: [] })
}
