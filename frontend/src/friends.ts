import { reactive } from 'vue'
import type { BoardFriend, FriendGroup } from './api/friends'

/** Shared by the friends list and profile displayed on the two notebook pages. */
export const friends_state = reactive({ friends: [] as BoardFriend[] })

/** Apply Django's saved fields to the same friend on the list page. */
export function set_friend_for_list(updated_friend: BoardFriend): void {
  friends_state.friends = friends_state.friends.map((friend) => friend.id === updated_friend.id ? updated_friend : friend)
}

/** Remove a friend from the displayed list after Django confirms deletion. */
export function remove_friend_for_list(friend_id: string): void {
  friends_state.friends = friends_state.friends.filter((friend) => friend.id !== friend_id)
}

/** Reflect a saved group's name and color wherever its friends are already displayed. */
export function set_group_for_friends(saved_group: FriendGroup): void {
  friends_state.friends = friends_state.friends.map((friend) => ({
    ...friend,
    groups: friend.groups.map((group) => group.id === saved_group.id ? saved_group : group)
      .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR', { sensitivity: 'base' })),
  }))
}

/** Remove a deleted group's links from displayed friends without removing the friends. */
export function remove_group_for_friends(group_id: string): void {
  friends_state.friends = friends_state.friends.map((friend) => ({
    ...friend, groups: friend.groups.filter((group) => group.id !== group_id),
  }))
}
