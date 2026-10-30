<script setup lang="ts">
import { new_friend_draft } from '../new-friend-draft'
import FriendBirthday from './FriendBirthday.vue'
import FriendCadence from './FriendCadence.vue'
import GroupBadge from './GroupBadge.vue'
</script>

<template>
  <div class="new-friend-draft" aria-hidden="true">
    <p class="nota">rascunho: a página aparece aqui enquanto você escreve.</p>
    <h1 class="draft-name" :class="{ 'is-empty': !new_friend_draft.name.trim() }">{{ new_friend_draft.name.trim() || 'Novo amigo' }}</h1>
    <p v-if="new_friend_draft.cadence_amount > 0" class="profile-cadence">a cada <FriendCadence :friend="new_friend_draft" /></p>
    <FriendBirthday class="draft-birthday" :birthday="new_friend_draft.birthday" />
    <div class="profile-groups">
      <GroupBadge v-for="group in new_friend_draft.groups" :key="group.id" :group="group" />
      <GroupBadge v-if="!new_friend_draft.groups.length" :group="{ name: 'sem grupo', color: 'neutral' }" />
    </div>
    <h2>Histórico</h2>
    <p class="nota">o primeiro contato entra aqui.</p>
  </div>
</template>

<style scoped>
.new-friend-draft p{margin:0;line-height:var(--notebook-line)}
.nota{font:400 1.375rem/var(--notebook-line) var(--font-handwriting);color:var(--pen-ink)}
.draft-name{margin:0;font:600 1.75rem/var(--notebook-line) var(--font-title);color:var(--ink);overflow-wrap:anywhere}
.draft-name.is-empty{color:var(--neutral-600)}
.profile-cadence,.draft-birthday{font:400 .875rem/var(--notebook-line) var(--font-ui);color:var(--neutral-700)}
.profile-groups{display:flex;flex-wrap:wrap;align-items:center;gap:0 .5rem;min-height:var(--notebook-line)}
.profile-groups :deep(.group-badge){max-width:100%}
.new-friend-draft h2{margin:var(--notebook-line) 0 0;font:600 1.1875rem/var(--notebook-line) var(--font-title)}
</style>
