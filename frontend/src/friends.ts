import { reactive } from 'vue'
import type { BoardFriend } from './api/friends'

/** Shared by the friends list and profile displayed on the two notebook pages. */
export const friends_state = reactive({ friends: [] as BoardFriend[] })

/** Apply Django's saved contact fields to the same friend on the list page. */
export function set_friend_for_list(updated_friend: BoardFriend): void {
  friends_state.friends = friends_state.friends.map((friend) => friend.id === updated_friend.id ? updated_friend : friend)
}
