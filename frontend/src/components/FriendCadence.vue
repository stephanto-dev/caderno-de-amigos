<script setup lang="ts">
import type { BoardFriend } from '../api/friends'

defineProps<{ friend: BoardFriend }>()

const CADENCE_LABELS = {
  day: { one: 'dia', many: 'dias' },
  week: { one: 'semana', many: 'semanas' },
  month: { one: 'mês', many: 'meses' },
  year: { one: 'ano', many: 'anos' },
} as const
</script>

<template>
  <span>{{ friend.cadence_amount }} {{ CADENCE_LABELS[friend.cadence_unit][friend.cadence_amount === 1 ? 'one' : 'many'] }}</span>
</template>
