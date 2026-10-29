<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { BoardFriend } from '../api/friends'
import GroupBadge from './GroupBadge.vue'
import FriendCadence from './FriendCadence.vue'

const props = defineProps<{ friend: BoardFriend; is_contact_disabled?: boolean }>()
const emit = defineEmits<{ 'open-contact-sheet': [friend: BoardFriend] }>()

const MAX_GROUP_HEIGHT = 40
const GROUP_ROW_HEIGHT = 18

const group_box = ref<HTMLElement | null>(null)
const overflow_badge = ref<HTMLElement | null>(null)
const has_two_group_rows = ref(false)
let group_observer: ResizeObserver | undefined

/** Fit badges into two rows; include the hidden names in the accessible overflow badge. */
function set_visible_groups_for_card(): void {
  const box = group_box.value
  const overflow = overflow_badge.value
  if (!box || !overflow) return
  const badges = Array.from(box.querySelectorAll<HTMLElement>('[data-group-id]'))
  badges.forEach((badge) => { badge.hidden = false })
  overflow.hidden = true
  let visible_count = badges.length
  while (box.scrollHeight > MAX_GROUP_HEIGHT && visible_count > 0) {
    visible_count -= 1
    badges[visible_count].hidden = true
    overflow.hidden = false
    const hidden_groups = props.friend.groups.slice(visible_count)
    overflow.textContent = `+${hidden_groups.length}`
    const description = `e mais ${hidden_groups.length} ${hidden_groups.length === 1 ? 'grupo' : 'grupos'}: ${hidden_groups.map((group) => group.name).join(', ')}`
    overflow.setAttribute('aria-label', description)
    overflow.title = description
  }
  has_two_group_rows.value = box.clientHeight > GROUP_ROW_HEIGHT
}

onMounted(() => {
  set_visible_groups_for_card()
  if (typeof ResizeObserver !== 'undefined' && group_box.value) {
    group_observer = new ResizeObserver(set_visible_groups_for_card)
    group_observer.observe(group_box.value)
  }
  document.fonts?.ready.then(set_visible_groups_for_card)
})
watch(() => props.friend.groups, set_visible_groups_for_card, { flush: 'post' })
onBeforeUnmount(() => group_observer?.disconnect())
</script>

<template>
  <li class="friend-postit" :class="[`group-${friend.groups[0]?.color ?? 'neutral'}`, { 'two-group-rows': has_two_group_rows }]"
    :aria-labelledby="`friend-${friend.id}${friend.is_birthday_today ? ` birthday-${friend.id}` : ''}`">
    <h3 :id="`friend-${friend.id}`" :title="friend.name">
      <RouterLink :to="`/amigos/${friend.id}`">{{ friend.name }}</RouterLink>
    </h3>
    <span class="sr-only">Grupos:</span>
    <div ref="group_box" class="friend-groups">
      <GroupBadge v-for="group in friend.groups" :key="group.id" :data-group-id="group.id" :group="group" />
      <GroupBadge v-if="friend.groups.length === 0" :group="{ name: 'sem grupo', color: 'neutral' }" />
      <span ref="overflow_badge" class="group-badge group-overflow" role="img" hidden></span>
    </div>
    <p class="friend-cadence"><FriendCadence :friend="friend" /></p>
    <p v-if="friend.last_note" class="friend-note" :title="friend.last_note">{{ friend.last_note }}</p>
    <p v-else class="friend-no-note">sem nota ainda</p>
    <button type="button" class="contact-button" :disabled="is_contact_disabled" :aria-label="`Falei agora com ${friend.name}`" @click="emit('open-contact-sheet', friend)">
      <span class="stamp">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12H4v-5ZM14 5l5 5" /></svg>
        falei agora
      </span>
    </button>
    <p v-if="friend.is_birthday_today" :id="`birthday-${friend.id}`" class="birthday-stamp">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" />
      </svg>
      <span>Aniversário hoje</span>
    </p>
  </li>
</template>

<style scoped>
.friend-postit { --rotation: -1.5deg; position: relative; container-type: inline-size; display: flex; flex-direction: column; box-sizing: border-box; min-width: 0; height: calc(var(--notebook-line) * 6); padding: 10px 10px 6px; background: var(--group-color); box-shadow: var(--shadow-paper); transform: rotate(var(--rotation)); transition: transform var(--duration-fast) var(--ease-out); line-height: 1.25; }
.friend-postit:nth-child(4n + 2) { --rotation: 1deg; }
.friend-postit:nth-child(4n + 3) { --rotation: 2deg; }
.friend-postit:nth-child(4n + 4) { --rotation: -1deg; }
.friend-postit:hover, .friend-postit:focus-within { transform: rotate(0); }
.friend-postit::before { content: ''; position: absolute; inset: 0 0 auto; height: 10px; background: rgb(43 36 32 / 5%); pointer-events: none; }
h3 { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 600 1.1875rem/1.75rem var(--font-title); }
h3 a { color: inherit; text-decoration: none; }
h3 a:hover { text-decoration: underline; text-underline-offset: 3px; }
.friend-groups { display: flex; flex-wrap: wrap; gap: 4px; max-height: 40px; margin: 2px 0; overflow: hidden; }
svg { width: 12px; height: 12px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.group-overflow { background: var(--sheet); font-weight: 600; }
.friend-cadence { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--neutral-700); font: 500 .75rem/1.25rem var(--font-ui); }
.friend-note { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 4px 0 0; color: var(--pen-ink); font: 500 1.3125rem/1.5rem var(--font-handwriting); }
.two-group-rows .friend-note { -webkit-line-clamp: 1; }
.friend-no-note { margin: 4px 0 0; color: var(--neutral-700); font: italic .75rem/1.5rem var(--font-ui); }
.contact-button { display: flex; align-items: center; align-self: flex-start; min-height: 44px; margin-top: auto; padding: 0 2px; border: 0; border-radius: var(--radius-sm); background: transparent; cursor: pointer; }
.contact-button:disabled { opacity: .55; cursor: wait; }
.contact-button .stamp { position: relative; isolation: isolate; padding: 0 8px; border-color: var(--primary-800); color: var(--primary-800); white-space: nowrap; }
/* Requested addition to CRM-13: a hand-colored fill replaces the flat hover background. */
.contact-button .stamp::before { content: ''; position: absolute; z-index: -1; inset: 1px; background: color-mix(in srgb, var(--primary) 38%, transparent); mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 28'%3E%3Cpath d='M1 23 7 4 9 25 15 2 17 24 23 3 25 26 31 2 33 25 39 4 41 24 47 2 49 26 55 3 57 24 63 2 65 25 71 4 73 26 79 2 81 24 87 3 89 26 95 2 97 25 103 4 105 24 111 2 113 25 119 4' fill='none' stroke='black' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 100% 100% no-repeat; clip-path: inset(0 100% 0 0); transition: clip-path var(--duration-medium) var(--ease-out); }
.contact-button:hover .stamp, .contact-button:focus-visible .stamp { background: transparent; }
.contact-button:hover .stamp::before, .contact-button:focus-visible .stamp::before { clip-path: inset(0); }
.contact-button svg { display: none; width: 16px; height: 16px; }
.birthday-stamp { position: absolute; right: -.25rem; top: calc(100% - .375rem); z-index: 2; max-width: calc(100% + .5rem); box-sizing: border-box; margin: 0;
 display: flex; align-items: center; gap: 3px; padding: 2px 6px 2px 5px; background: var(--sheet); color: var(--primary-800); border: 1.5px solid var(--primary-800); border-radius: 4px;
 box-shadow: var(--shadow-paper); transform: rotate(-2.5deg); font: 600 .75rem/1rem var(--font-ui); pointer-events: none; }
.birthday-stamp svg { width: 14px; height: 14px; }
.birthday-stamp::before { content: ''; position: absolute; inset: -4px auto auto 50%; width: 18px; height: 7px; margin-left: -9px; background: rgb(43 36 32 / 8%); transform: rotate(4deg); }
@container (max-width: 8.25rem) { .birthday-stamp { padding: 2px 5px; } .birthday-stamp svg { display: none; } }
@media (forced-colors: active) { .birthday-stamp { border-color: CanvasText; } }
@media (min-width: 1024px) { .contact-button svg { display: inline-block; } }
@media (max-width: 359px) { .contact-button .stamp { padding: 0 4px; font-size: 1.125rem; } }
@media (prefers-reduced-motion: reduce) { .friend-postit, .contact-button .stamp::before { transition: none; } }
</style>
