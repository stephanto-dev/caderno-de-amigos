<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { get_friend_for_board, send_friend_deletion_for_owner } from '../api/friends'
import type { BoardFriend, FriendContact, FriendGroup, RecordedContact } from '../api/friends'
import { ApiError } from '../api/http'
import FriendCadence from '../components/FriendCadence.vue'
import GroupBadge from '../components/GroupBadge.vue'
import ContactSheet from '../components/ContactSheet.vue'
import FriendForm from '../components/FriendForm.vue'
import FriendHistory from '../components/FriendHistory.vue'
import { set_friend_for_list, remove_friend_for_list } from '../friends'

const NOT_FOUND_STATUS = 404
const CONTACT_DATE_FORMAT = new Intl.DateTimeFormat('pt-BR')
const COLUMN_LABELS = {
  just_talked: 'Falei agora', overdue: 'Faz um tempinho', this_week: 'Essa semana', on_track: 'Em dia',
} as const
const route = useRoute()
const router = useRouter()
const friend = ref<BoardFriend | null>(null)
const profile_heading = ref<HTMLHeadingElement | null>(null)
const is_loading = ref(true)
const has_error = ref(false)
const is_not_found = ref(false)
const is_contact_sheet_open = ref(false)
const contact_button = ref<HTMLButtonElement | null>(null)
const contact_announcement = ref('')
const newest_contact = ref<FriendContact | null>(null)
const is_editing = ref(false)
const is_delete_confirmation_open = ref(false)
const is_deleting = ref(false)
const deletion_error = ref('')
const friend_announcement = ref('')
const edit_button = ref<HTMLButtonElement | null>(null)
const delete_button = ref<HTMLButtonElement | null>(null)
const delete_confirmation_button = ref<HTMLButtonElement | null>(null)
let request_version = 0

function open_friend_editor(): void {
  is_editing.value = true
  is_delete_confirmation_open.value = false
  contact_announcement.value = ''
  friend_announcement.value = ''
}

async function close_friend_editor(): Promise<void> {
  is_editing.value = false
  await nextTick()
  edit_button.value?.focus()
}

function set_saved_friend_for_profile(saved_friend: BoardFriend): void {
  set_friend_for_list(saved_friend)
  if (saved_friend.id !== friend.value?.id) return
  friend.value = saved_friend
  friend_announcement.value = 'Amigo atualizado.'
  void close_friend_editor()
}

/** Group edits are saved immediately, even if the owner later cancels the friend edit. */
function set_updated_group_for_profile(saved_group: FriendGroup): void {
  if (!friend.value) return
  friend.value = {
    ...friend.value,
    groups: friend.value.groups.map((group) => group.id === saved_group.id ? saved_group : group)
      .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR', { sensitivity: 'base' })),
  }
}

function remove_group_for_profile(group_id: string): void {
  if (!friend.value) return
  friend.value = { ...friend.value, groups: friend.value.groups.filter((group) => group.id !== group_id) }
}

async function open_friend_deletion_confirmation(): Promise<void> {
  is_delete_confirmation_open.value = true
  deletion_error.value = ''
  await nextTick()
  delete_confirmation_button.value?.focus()
}

async function close_friend_deletion_confirmation(): Promise<void> {
  is_delete_confirmation_open.value = false
  deletion_error.value = ''
  await nextTick()
  delete_button.value?.focus()
}

async function send_friend_deletion_for_profile(): Promise<void> {
  if (!friend.value || !is_delete_confirmation_open.value || is_deleting.value) return
  const friend_id = friend.value.id
  const current_request_version = request_version
  is_deleting.value = true
  deletion_error.value = ''
  try {
    await send_friend_deletion_for_owner(friend_id)
    remove_friend_for_list(friend_id)
    if (current_request_version === request_version) await router.push('/amigos')
  } catch {
    if (current_request_version === request_version) {
      deletion_error.value = 'Não foi possível apagar o amigo. Tente novamente.'
    }
  } finally {
    if (current_request_version === request_version) is_deleting.value = false
  }
}

async function close_contact_sheet_for_profile(): Promise<void> {
  is_contact_sheet_open.value = false
  await nextTick()
  contact_button.value?.focus()
}

function set_recorded_contact_for_profile(contact: RecordedContact): void {
  if (contact.id !== friend.value?.id) return
  friend.value = contact
  newest_contact.value = contact.contact
  set_friend_for_list(contact)
  contact_announcement.value = 'Contato registrado. Boa conversa!'
  void close_contact_sheet_for_profile()
}

/** Ignore stale responses when the owner switches profiles before a request finishes. */
async function get_friend_for_view(): Promise<void> {
  const current_request_version = ++request_version
  const friend_id = String(route.params.id)
  is_contact_sheet_open.value = false
  is_editing.value = false
  is_delete_confirmation_open.value = false
  is_deleting.value = false
  deletion_error.value = ''
  friend_announcement.value = ''
  contact_announcement.value = ''
  friend.value = null
  newest_contact.value = null
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
      <p v-if="friend_announcement" class="profile-feedback" role="status">{{ friend_announcement }}</p>
      <FriendForm v-if="is_editing" :key="friend.id" :friend="friend" @saved="set_saved_friend_for_profile"
        @cancel="close_friend_editor" @group_updated="set_updated_group_for_profile" @group_deleted="remove_group_for_profile" />
      <template v-else>
        <p class="profile-cadence">a cada <FriendCadence :friend="friend" /></p>
        <button ref="contact_button" type="button" name="record-contact" class="stamp profile-contact-button" :disabled="is_deleting" @click="contact_announcement = ''; is_contact_sheet_open = true">registrar contato</button>
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
        </dl>
        <div class="profile-actions">
          <button ref="edit_button" type="button" name="edit-friend" :disabled="is_deleting" @click="open_friend_editor">Editar amigo</button>
          <button ref="delete_button" type="button" name="delete-friend" :disabled="is_deleting" @click="open_friend_deletion_confirmation">Apagar amigo</button>
        </div>
        <div v-if="is_delete_confirmation_open" class="friend-deletion" :aria-busy="is_deleting">
          <p role="alert">Apagar {{ friend.name }} e todos os seus contatos? Essa ação não pode ser desfeita. Os grupos continuam no caderno.</p>
          <p v-if="deletion_error" class="deletion-error" role="alert">{{ deletion_error }}</p>
          <div class="profile-actions">
            <button ref="delete_confirmation_button" type="button" name="confirm-delete-friend" :disabled="is_deleting" @click="send_friend_deletion_for_profile">{{ is_deleting ? 'Apagando…' : 'Confirmar exclusão' }}</button>
            <button type="button" name="cancel-delete-friend" :disabled="is_deleting" @click="close_friend_deletion_confirmation">Cancelar</button>
          </div>
        </div>
        <ContactSheet v-if="is_contact_sheet_open" :friend="friend" @close="close_contact_sheet_for_profile" @recorded="set_recorded_contact_for_profile" />
      </template>
      <FriendHistory v-show="!is_editing" :key="friend.id" :friend="friend" :newest_contact="newest_contact" />
    </template>
  </div>
</template>

<style scoped>
.friend-profile .view-title { overflow-wrap: anywhere; }
.back-link { display: flex; width: fit-content; min-width: 2.75rem; align-items: flex-end; height: 2.75rem; margin-top: -.75rem; font: 500 .875rem/var(--notebook-line) var(--font-ui); color: var(--neutral-700); text-decoration: underline; text-underline-offset: 3px; }
.profile-cadence { margin: 0; color: var(--neutral-600); }
.profile-contact-button { box-sizing: border-box; min-height: 44px; margin-top: 12px; }
.profile-feedback { margin: var(--notebook-line) 0 0; color: var(--success-700); }
.profile-details { margin: var(--notebook-line) 0 0; }
.profile-details > div { margin-bottom: var(--notebook-line); }
dt { color: var(--neutral-700); font-size: .875rem; font-weight: 600; }
dd { margin: 0; overflow-wrap: anywhere; }
.profile-groups { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-height: var(--notebook-line); }
.profile-groups .group-badge { max-width: 100%; }
.profile-state { margin: var(--notebook-line) 0; }
.profile-state p { margin: 0 0 var(--notebook-line); }
.profile-state .stamp { box-sizing: border-box; min-height: 44px; }
.profile-actions { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.profile-actions button { min-height: 44px; padding: 0; border: 0; background: transparent; color: var(--neutral-700); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.profile-actions button:disabled { opacity: .45; cursor: wait; }
.friend-deletion { margin-top: var(--notebook-line); }
.friend-deletion p { margin: 0 0 8px; }
.deletion-error, .profile-actions button[name="confirm-delete-friend"] { color: var(--error); }
</style>
