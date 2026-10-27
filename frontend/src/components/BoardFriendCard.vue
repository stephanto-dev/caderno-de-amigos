<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { BoardFriend } from '../api/friends'

const props = defineProps<{ friend: BoardFriend }>()
const emit = defineEmits<{ 'open-contact-sheet': [friend: BoardFriend] }>()

const CADENCE_LABELS = {
  day: { one: 'dia', many: 'dias' },
  week: { one: 'semana', many: 'semanas' },
  month: { one: 'mês', many: 'meses' },
  year: { one: 'ano', many: 'anos' },
} as const
const GROUP_ICON_PATHS = {
  family: 'm3 10 9-7 9 7v11h-6v-8H9v8H3Z',
  college: 'm2 9 10-5 10 5-10 5Zm4 2v6q6 5 12 0v-6M22 9v8',
  work: 'M3 7h18v14H3ZM8 7V3h8v4M3 12h18M10 12v3h4v-3',
  neighborhood: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  neutral: 'M12 3h1m5 2 1 1m2 5v2m-2 5-1 1m-5 2h-2m-5-2-1-1m-2-5v-2m2-5 1-1',
} as const
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
    const description = `e mais ${hidden_groups.length} grupos: ${hidden_groups.map((group) => group.name).join(', ')}`
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
  <li class="friend-postit" :class="[`group-${friend.groups[0]?.color ?? 'neutral'}`, { 'two-group-rows': has_two_group_rows }]" :aria-labelledby="`friend-${friend.id}`">
    <h3 :id="`friend-${friend.id}`" :title="friend.name">
      <RouterLink :to="`/amigos/${friend.id}`">{{ friend.name }}</RouterLink>
    </h3>
    <span class="sr-only">Grupos:</span>
    <div ref="group_box" class="friend-groups">
      <span v-for="group in friend.groups" :key="group.id" :data-group-id="group.id" class="group-badge" :class="`group-${group.color}`" :title="group.name">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="GROUP_ICON_PATHS[group.color]" /></svg>
        <span>{{ group.name }}</span>
      </span>
      <span v-if="friend.groups.length === 0" class="group-badge group-neutral">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="GROUP_ICON_PATHS.neutral" /></svg>
        <span>sem grupo</span>
      </span>
      <span ref="overflow_badge" class="group-badge group-overflow" role="img" hidden></span>
    </div>
    <p class="friend-cadence">{{ friend.cadence_amount }} {{ CADENCE_LABELS[friend.cadence_unit][friend.cadence_amount === 1 ? 'one' : 'many'] }}</p>
    <p v-if="friend.last_note" class="friend-note" :title="friend.last_note">{{ friend.last_note }}</p>
    <p v-else class="friend-no-note">sem nota ainda</p>
    <button type="button" class="contact-button" :aria-label="`Falei agora com ${friend.name}`" @click="emit('open-contact-sheet', friend)">
      <span class="stamp">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12H4v-5ZM14 5l5 5" /></svg>
        falei agora
      </span>
    </button>
  </li>
</template>

<style scoped>
.friend-postit { --rotation: -1.5deg; position: relative; display: flex; flex-direction: column; box-sizing: border-box; min-width: 0; height: calc(var(--notebook-line) * 6); padding: 10px 10px 6px; background: var(--group-color); box-shadow: var(--shadow-paper); transform: rotate(var(--rotation)); transition: transform var(--duration-fast) var(--ease-out); line-height: 1.25; }
.friend-postit:nth-child(4n + 2) { --rotation: 1deg; }
.friend-postit:nth-child(4n + 3) { --rotation: 2deg; }
.friend-postit:nth-child(4n + 4) { --rotation: -1deg; }
.friend-postit:hover, .friend-postit:focus-within { transform: rotate(0); }
.friend-postit::before { content: ''; position: absolute; inset: 0 0 auto; height: 10px; background: rgb(43 36 32 / 5%); pointer-events: none; }
.group-family { --group-color: var(--primary-100); }
.group-college { --group-color: var(--highlight); }
.group-work { --group-color: var(--ruling); }
.group-neighborhood { --group-color: var(--tab-green); }
.group-neutral { --group-color: var(--paper); }
h3 { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 600 1.1875rem/1.75rem var(--font-title); }
h3 a { color: inherit; text-decoration: none; }
h3 a:hover { text-decoration: underline; text-underline-offset: 3px; }
.friend-groups { display: flex; flex-wrap: wrap; gap: 4px; max-height: 40px; margin: 2px 0; overflow: hidden; }
.group-badge { display: inline-flex; align-items: center; gap: 3px; box-sizing: border-box; height: 18px; max-width: 100%; padding: 0 6px; border-radius: 4px; background: var(--group-color); box-shadow: inset 0 0 0 1px rgb(43 36 32 / 32%); color: var(--neutral-700); font: 500 .75rem/18px var(--font-ui); white-space: nowrap; }
.group-badge[hidden] { display: none; }
.group-badge span { overflow: hidden; text-overflow: ellipsis; }
svg { width: 12px; height: 12px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.group-overflow { background: var(--sheet); font-weight: 600; }
.friend-cadence { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--neutral-700); font: 500 .75rem/1.25rem var(--font-ui); }
.friend-note { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 4px 0 0; color: var(--pen-ink); font: 500 1.3125rem/1.5rem var(--font-handwriting); }
.two-group-rows .friend-note { -webkit-line-clamp: 1; }
.friend-no-note { margin: 4px 0 0; color: var(--neutral-700); font: italic .75rem/1.5rem var(--font-ui); }
.contact-button { display: flex; align-items: center; align-self: flex-start; min-height: 44px; margin-top: auto; padding: 0 2px; border: 0; border-radius: var(--radius-sm); background: transparent; cursor: pointer; }
.contact-button .stamp { padding: 0 8px; border-color: var(--primary-800); color: var(--primary-800); }
.contact-button:hover .stamp { background: var(--sheet); }
.contact-button svg { display: none; width: 16px; height: 16px; }
@media (min-width: 1024px) { .contact-button svg { display: inline-block; } }
@media (prefers-reduced-motion: reduce) { .friend-postit { transition: none; } }
</style>
