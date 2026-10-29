<script setup lang="ts">
import type { FriendGroup } from '../api/friends'

defineProps<{ group: Pick<FriendGroup, 'name' | 'color'> }>()
</script>

<template>
  <span class="group-badge" :class="`group-${group.color}`" :title="group.name">
    <span>{{ group.name }}</span>
  </span>
</template>
