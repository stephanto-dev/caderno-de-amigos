import type { RouteRecordRaw, Router } from 'vue-router'
import { auth_state, get_session_for_browser } from './auth'
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

export function install_auth_guard_for_router(router: Router): void {
  router.beforeEach(async (to) => {
    if (!auth_state.is_initialized) await get_session_for_browser()
    // /api/me/ returns 200 with authenticated:false so a visitor also receives the CSRF cookie.
    if (to.name !== 'login' && auth_state.current_user === null) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  })
}
