<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const TODAY_TIME_ZONE = 'America/Sao_Paulo'
const CLOCK_REFRESH_INTERVAL_MS = 1_000
const WEEKDAYS = [
  { label: 'domingo', initial: 'D' },
  { label: 'segunda-feira', initial: 'S' },
  { label: 'terça-feira', initial: 'T' },
  { label: 'quarta-feira', initial: 'Q' },
  { label: 'quinta-feira', initial: 'Q' },
  { label: 'sexta-feira', initial: 'S' },
  { label: 'sábado', initial: 'S' },
] as const
const date_formatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TODAY_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
})
const weekday_formatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TODAY_TIME_ZONE, weekday: 'long',
})
const now = ref(new Date())
const today = computed(() => {
  const date_label = date_formatter.format(now.value)
  return {
    date_label,
    date_iso: date_label.split('/').reverse().join('-'),
    weekday: weekday_formatter.format(now.value),
  }
})
let clock_interval: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  clock_interval = setInterval(() => { now.value = new Date() }, CLOCK_REFRESH_INTERVAL_MS)
})
onUnmounted(() => { clearInterval(clock_interval) })
</script>

<template>
  <div class="cabecalho-folha" role="group" aria-label="Data de hoje">
    <ol class="sheet-weekdays" aria-label="Dia da semana">
      <li
        v-for="day in WEEKDAYS"
        :key="day.label"
        :aria-label="day.label"
        :aria-current="day.label === today.weekday ? 'date' : undefined"
      >{{ day.initial }}</li>
    </ol>
    <time class="sheet-date" :datetime="today.date_iso">{{ today.date_label }}</time>
  </div>
</template>

<style scoped>
.cabecalho-folha { display: flex; align-items: center; justify-content: space-between; gap: 12px; height: var(--notebook-line); }
.sheet-weekdays { display: flex; align-items: center; gap: 4px; min-width: 0; list-style: none; margin: 0; padding: 0; }
.sheet-weekdays li { display: grid; place-items: center; box-sizing: border-box; width: 22px; height: 22px; border: 1.5px solid var(--ink); border-radius: 2px; background: transparent; color: var(--ink); font: 600 11px/1 var(--font-ui); }
.sheet-weekdays li[aria-current="date"] { background: var(--ink); color: #fff; border-width: 2px; font-weight: 700; }
.sheet-date { flex: none; padding: 0 2px 2px; border-bottom: 1.5px dashed var(--neutral-400); color: var(--ink); font: 700 21px/1 var(--font-handwriting); letter-spacing: .03em; white-space: nowrap; }
@media (max-width: 360px) {
  .cabecalho-folha { flex-wrap: wrap; row-gap: 0; height: calc(var(--notebook-line) * 2); }
  .sheet-weekdays { flex: none; }
  .sheet-date { margin-left: auto; }
}
</style>
