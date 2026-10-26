import type { RouteRecordRaw } from 'vue-router'
import BoardView from './views/BoardView.vue'
import FriendsView from './views/FriendsView.vue'
import NewFriendView from './views/NewFriendView.vue'
import FriendDetailView from './views/FriendDetailView.vue'
import LoginView from './views/LoginView.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'board', component: BoardView },
  { path: '/amigos', name: 'friends', component: FriendsView },
  { path: '/amigos/novo', name: 'new-friend', component: NewFriendView },
  {
    path: '/amigos/:id',
    name: 'friend-detail',
    components: { default: FriendsView, detail: FriendDetailView },
  },
  { path: '/login', name: 'login', component: LoginView },
]
