<script setup lang="ts">
import { computed, onMounted, ref, toRef } from 'vue'
import { RouterLink } from 'vue-router'
import { get_friends_for_board } from '../api/friends'
import type { BoardFriend } from '../api/friends'
import { friends_state } from '../friends'

const CONTACT_DATE_FORMAT = new Intl.DateTimeFormat('pt-BR')
const friends = toRef(friends_state, 'friends')
const search = ref('')
const is_loading = ref(true)
const has_error = ref(false)
const matching_friends = computed(() => {
  const name_query = search.value.trim().toLocaleLowerCase('pt-BR')
  return friends.value.filter((friend) => friend.name.toLocaleLowerCase('pt-BR').includes(name_query))
})

function get_last_contact_label_for_friend(friend: BoardFriend): string {
  return friend.last_contact_at
    ? CONTACT_DATE_FORMAT.format(new Date(friend.last_contact_at))
    : 'ainda não registrado'
}

async function get_friends_for_view(): Promise<void> {
  friends.value = []
  is_loading.value = true
  has_error.value = false
  try {
    friends.value = await get_friends_for_board()
  } catch {
    has_error.value = true
  } finally {
    is_loading.value = false
  }
}

onMounted(get_friends_for_view)
</script>

<template>
  <div class="friends-view">
    <header class="friends-header">
      <h1 class="view-title">Amigos</h1>
      <RouterLink to="/amigos/novo" class="stamp">novo amigo</RouterLink>
    </header>
    <label class="friends-search">
      <span class="sr-only">Buscar amigos por nome</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg>
      <input v-model="search" type="search" placeholder="Buscar por nome" :disabled="is_loading || has_error">
    </label>
    <p v-if="is_loading" class="friends-state" role="status" aria-busy="true">Carregando seus amigos…</p>
    <div v-else-if="has_error" class="friends-state" role="alert">
      <p>Não conseguimos carregar seus amigos. Verifique sua conexão e tente novamente.</p>
      <button type="button" class="stamp" @click="get_friends_for_view">Tentar novamente</button>
    </div>
    <p v-else-if="friends.length === 0" class="friends-state handwritten-note">Seu caderno ainda não tem amigos.</p>
    <template v-else>
      <p v-if="matching_friends.length === 0" class="friends-state handwritten-note" role="status">ninguém com “{{ search.trim() }}” por aqui.</p>
      <RouterLink v-if="matching_friends.length === 0" to="/amigos/novo" class="stamp add-searched-friend">adicionar {{ search.trim() }}</RouterLink>
      <ul v-else class="friends-list" aria-label="Amigos">
        <li v-for="friend in matching_friends" :key="friend.id">
          <RouterLink v-slot="{ isActive }" :to="`/amigos/${friend.id}`" class="friend-row" active-class="selected-friend" :title="friend.name">
            <span class="friend-information">
              <span class="friend-name">{{ friend.name }}</span>
              <span class="friend-last-contact">último contato: {{ get_last_contact_label_for_friend(friend) }}</span>
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            <span v-if="isActive" class="sr-only">perfil aberto</span>
          </RouterLink>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.friends-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; }
.friends-header .stamp { display: inline-flex; align-items: center; min-height: 44px; }
.friends-search { display: flex; align-items: center; gap: 12px; height: calc(var(--notebook-line) * 2); }
svg { flex: none; width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.friends-search input { box-sizing: border-box; width: 100%; min-width: 0; height: 48px; padding: 8px 4px 0; border: 0; border-radius: 0; appearance: none; background: linear-gradient(var(--neutral-500), var(--neutral-500)) no-repeat 0 calc(100% - .3125rem)/100% 1.5px; color: var(--pen-ink); caret-color: var(--pen-ink); font: 400 1rem/var(--notebook-line) var(--font-ui); }
.friends-search input:focus { outline: none; box-shadow: none; background: linear-gradient(var(--focus), var(--focus)) no-repeat 0 calc(100% - .25rem)/100% 3px, linear-gradient(var(--highlight-50), var(--highlight-50)) no-repeat 0 calc(100% - .3125rem)/100% 1.6875rem; }
.friends-search:focus-within > svg { color: var(--pen-ink); }
.friends-search input::placeholder { color: var(--neutral-700); opacity: 1; font: 500 1.375rem/var(--notebook-line) var(--font-handwriting); }
.friends-search input:disabled { opacity: .55; }
.friends-list { margin: 0; padding: 0; list-style: none; }
.friend-row { display: flex; align-items: center; gap: 12px; min-height: calc(var(--notebook-line) * 2); padding: 0 8px; border-radius: var(--radius-sm); color: var(--ink); text-decoration: none; }
.friend-row:hover, .selected-friend { background: var(--highlight-50); }
.friend-information { flex: 1; min-width: 0; }
.friend-name, .friend-last-contact { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: var(--notebook-line); }
.friend-name { font-family: var(--font-title); font-size: 1.1875rem; font-weight: 600; }
.friend-row:hover .friend-name { color: var(--primary-700); }
.friend-last-contact { color: var(--neutral-600); font-size: .875rem; }
.friends-state { margin: var(--notebook-line) 0; overflow-wrap: anywhere; line-height: var(--notebook-line); }
.add-searched-friend { display: block; box-sizing: border-box; width: fit-content; max-width: 100%; height: auto; min-height: 44px; padding: 4px 10px; overflow-wrap: anywhere; line-height: var(--notebook-line); }
.friends-state p { margin: 0 0 var(--notebook-line); }
button { cursor: pointer; }
</style>
