<script setup lang="ts">
import { computed } from 'vue'
import { format_birthday_for_display } from '../birthday'

const props = defineProps<{ birthday: string | null }>()
const formatted_birthday = computed(() => format_birthday_for_display(props.birthday))
</script>

<template>
  <p v-if="formatted_birthday" class="friend-birthday">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" /></svg>
    {{ formatted_birthday }}
  </p>
</template>

<style scoped>
.friend-birthday{display:flex;align-items:center;gap:.375rem}
svg{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;color:var(--primary)}
</style>
