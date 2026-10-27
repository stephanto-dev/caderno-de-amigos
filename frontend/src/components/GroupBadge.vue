<script setup lang="ts">
import type { FriendGroup } from '../api/friends'

defineProps<{ group: Pick<FriendGroup, 'name' | 'color'> }>()

const GROUP_ICON_PATHS = {
  family: 'm3 10 9-7 9 7v11h-6v-8H9v8H3Z',
  college: 'm2 9 10-5 10 5-10 5Zm4 2v6q6 5 12 0v-6M22 9v8',
  work: 'M3 7h18v14H3ZM8 7V3h8v4M3 12h18M10 12v3h4v-3',
  neighborhood: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  neutral: 'M12 3h1m5 2 1 1m2 5v2m-2 5-1 1m-5 2h-2m-5-2-1-1m-2-5v-2m2-5 1-1',
} as const
</script>

<template>
  <span class="group-badge" :class="`group-${group.color}`" :title="group.name">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="GROUP_ICON_PATHS[group.color]" /></svg>
    <span>{{ group.name }}</span>
  </span>
</template>

<style scoped>
svg { width: 12px; height: 12px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
</style>
