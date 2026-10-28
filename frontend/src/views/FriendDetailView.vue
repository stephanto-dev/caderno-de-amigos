<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { get_friend_for_board } from '../api/friends'
import type { BoardFriend, RecordedContact } from '../api/friends'
import { ApiError } from '../api/http'
import FriendCadence from '../components/FriendCadence.vue'
import GroupBadge from '../components/GroupBadge.vue'
import ContactSheet from '../components/ContactSheet.vue'
import { set_friend_for_list } from '../friends'

const NOT_FOUND_STATUS = 404
const CONTACT_DATE_FORMAT = new Intl.DateTimeFormat('pt-BR')
const COLUMN_LABELS = {
  just_talked: 'Falei agora', overdue: 'Faz um tempinho', this_week: 'Essa semana', on_track: 'Em dia',
} as const
const route = useRoute()
const friend = ref<BoardFriend | null>(null)
const profile_heading = ref<HTMLHeadingElement | null>(null)
const is_loading = ref(true)
const has_error = ref(false)
const is_not_found = ref(false)
const is_contact_sheet_open = ref(false)
const contact_button = ref<HTMLButtonElement | null>(null)
const contact_announcement = ref('')
let request_version = 0

async function close_contact_sheet_for_profile(): Promise<void> {
  is_contact_sheet_open.value = false
  await nextTick()
  contact_button.value?.focus()
}

function set_recorded_contact_for_profile(contact: RecordedContact): void {
  if (contact.id !== friend.value?.id) return
  friend.value = contact
  set_friend_for_list(contact)
  contact_announcement.value = 'Contato registrado. Boa conversa!'
  void close_contact_sheet_for_profile()
}

/** Ignore stale responses when the owner switches profiles before a request finishes. */
async function get_friend_for_view(): Promise<void> {
  const current_request_version = ++request_version
  const friend_id = String(route.params.id)
  is_contact_sheet_open.value = false
  contact_announcement.value = ''
  friend.value = null
  is_loading.value = true
  has_error.value = false
  is_not_found.value = false
  try {
    const owned_friend = await get_friend_for_board(friend_id)
    if (current_request_version === request_version) friend.value = owned_friend
  } catch (error) {
    if (current_request_version !== request_version) return
    is_not_found.value = error instanceof ApiError && error.status === NOT_FOUND_STATUS
    has_error.value = !is_not_found.value
  } finally {
    if (current_request_version === request_version) {
      is_loading.value = false
      await nextTick()
      profile_heading.value?.focus()
    }
  }
}

watch(() => route.params.id, get_friend_for_view, { immediate: true })
onBeforeUnmount(() => { request_version += 1 })
</script>

<template>
  <div class="friend-profile">
    <RouterLink to="/amigos" class="back-link">Voltar</RouterLink>
    <h1 ref="profile_heading" class="view-title" tabindex="-1">{{ friend?.name ?? 'Perfil do amigo' }}</h1>
    <p v-if="is_loading" class="profile-state" role="status" aria-busy="true">Carregando o perfil…</p>
    <div v-else-if="is_not_found" class="profile-state" role="alert">
      <p>Amigo não encontrado. Volte à lista para escolher outro amigo.</p>
      <RouterLink to="/amigos" class="stamp">Ver amigos</RouterLink>
    </div>
    <div v-else-if="has_error" class="profile-state" role="alert">
      <p>Não conseguimos carregar este perfil. Verifique sua conexão e tente novamente.</p>
      <button type="button" class="stamp" @click="get_friend_for_view">Tentar novamente</button>
    </div>
    <template v-else-if="friend">
      <p class="profile-cadence">a cada <FriendCadence :friend="friend" /></p>
      <button ref="contact_button" type="button" name="record-contact" class="stamp profile-contact-button" @click="contact_announcement = ''; is_contact_sheet_open = true">registrar contato</button>
      <p v-if="contact_announcement" class="profile-feedback" role="status">{{ contact_announcement }}</p>
      <dl class="profile-details">
        <div>
          <dt>Grupos</dt>
          <dd class="profile-groups">
            <GroupBadge v-for="group in friend.groups" :key="group.id" :group="group" />
            <GroupBadge v-if="friend.groups.length === 0" :group="{ name: 'sem grupo', color: 'neutral' }" />
          </dd>
        </div>
        <div><dt>No Quadro</dt><dd>{{ COLUMN_LABELS[friend.column] }}</dd></div>
        <div>
          <dt>Último contato</dt>
          <dd><time v-if="friend.last_contact_at" :datetime="friend.last_contact_at">{{ CONTACT_DATE_FORMAT.format(new Date(friend.last_contact_at)) }}</time><span v-else>Nenhum contato registrado ainda.</span></dd>
        </div>
        <div><dt>Última nota</dt><dd class="profile-note handwritten-note">{{ friend.last_note || 'Nenhuma nota registrada ainda.' }}</dd></div>
      </dl>
      <!-- CRM-15 permits placeholders until CRM-16 provides editing and deletion. -->
      <div class="profile-actions" aria-describedby="friend-actions-help">
        <button type="button" name="edit-friend" disabled>Editar amigo</button>
        <button type="button" name="delete-friend" disabled>Apagar amigo</button>
      </div>
      <p id="friend-actions-help" class="profile-actions-help">Editar e apagar ainda não estão disponíveis.</p>
      <ContactSheet v-if="is_contact_sheet_open" :friend="friend" @close="close_contact_sheet_for_profile" @recorded="set_recorded_contact_for_profile" />
    </template>
  </div>
</template>

<style scoped>
.friend-profile .view-title { overflow-wrap: anywhere; }
.back-link { min-height: 44px; }
.profile-cadence { margin: 0; color: var(--neutral-600); }
.profile-contact-button { box-sizing: border-box; min-height: 44px; margin-top: 12px; }
.profile-feedback { margin: var(--notebook-line) 0 0; color: var(--success-700); }
.profile-details { margin: var(--notebook-line) 0 0; }
.profile-details > div { margin-bottom: var(--notebook-line); }
dt { color: var(--neutral-700); font-size: .875rem; font-weight: 600; }
dd { margin: 0; overflow-wrap: anywhere; }
.profile-groups { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-height: var(--notebook-line); }
.profile-groups .group-badge { max-width: 100%; }
.profile-note { white-space: pre-wrap; }
.profile-state { margin: var(--notebook-line) 0; }
.profile-state p { margin: 0 0 var(--notebook-line); }
.profile-state .stamp { box-sizing: border-box; min-height: 44px; }
.profile-actions { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.profile-actions button { min-height: 44px; padding: 0; border: 0; background: transparent; color: var(--neutral-600); text-decoration: underline; text-underline-offset: 3px; cursor: not-allowed; }
.profile-actions-help { margin: 0; color: var(--neutral-600); font-size: .875rem; }
</style>
