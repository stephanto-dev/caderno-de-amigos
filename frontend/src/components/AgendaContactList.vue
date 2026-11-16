<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/vue-virtual'
import type { Range } from '@tanstack/vue-virtual'
import { agenda_import_state, get_duplicate_friend_for_agenda_contact, get_duplicate_selected_agenda_contact, set_agenda_contact_selection, set_phone_for_agenda_contact } from '../agenda-import'
import type { AgendaContact } from '../agenda'
import { format_birthday_for_display } from '../birthday'
import { format_phone_for_display } from '../phone'

const ESTIMATED_CONTACT_HEIGHT = 96
const CONTACT_OVERSCAN = 6
const KEYBOARD_NAVIGATION_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End']
const search = ref('')
const search_input = ref<HTMLInputElement | null>(null)
const list = ref<HTMLElement | null>(null)
const page = ref<HTMLElement | null>(null)
const scroll_margin = ref(0)
const scroll_padding_end = ref(0)
const focused_index = ref<number | null>(null)
const matching_contacts = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('pt-BR')
  return agenda_import_state.contacts.filter((contact) => contact.name.toLocaleLowerCase('pt-BR').includes(query))
})
const virtualizer = useVirtualizer<HTMLElement, HTMLElement>(computed(() => {
  const focused = focused_index.value
  return {
    count: matching_contacts.value.length, getScrollElement: () => page.value,
    estimateSize: () => ESTIMATED_CONTACT_HEIGHT, overscan: CONTACT_OVERSCAN,
    scrollMargin: scroll_margin.value,
    scrollPaddingEnd: scroll_padding_end.value,
    getItemKey: (index: number) => matching_contacts.value[index]!.id,
    rangeExtractor: (range: Range) => [...new Set([...defaultRangeExtractor(range), ...(focused === null ? [] : [focused])])].sort((first, second) => first - second),
  }
}))
const visible_rows = computed(() => virtualizer.value.getVirtualItems().map((row) => ({ row, contact: matching_contacts.value[row.index]! })))
let page_observer: ResizeObserver | undefined

function measure_agenda_contact_row(element: Element | ComponentPublicInstance | null): void {
  if (element instanceof HTMLElement) virtualizer.value.measureElement(element)
}

function is_agenda_contact_disabled(contact: AgendaContact): boolean {
  return agenda_import_state.saved_contact_ids.has(contact.id) || !!get_duplicate_friend_for_agenda_contact(contact) || !!get_duplicate_selected_agenda_contact(contact)
}

function measure_agenda_list(): void {
  if (!page.value || !list.value) return
  scroll_margin.value = list.value.getBoundingClientRect().top - page.value.getBoundingClientRect().top + page.value.scrollTop
  const actions = page.value.querySelector<HTMLElement>('.agenda-selection-actions')
  scroll_padding_end.value = (actions?.getBoundingClientRect().height ?? 0) + Number.parseFloat(getComputedStyle(page.value).paddingBottom || '0')
}

function focus_agenda_search(event: KeyboardEvent): void {
  if (event.key !== '/' || event.defaultPrevented || event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
  event.preventDefault()
  search_input.value?.focus()
}

async function focus_agenda_contact_for_keyboard(event: KeyboardEvent, index: number): Promise<void> {
  if (!KEYBOARD_NAVIGATION_KEYS.includes(event.key)) return
  event.preventDefault()
  const last = matching_contacts.value.length - 1
  const direction = event.key === 'ArrowUp' || event.key === 'End' ? -1 : 1
  let next = event.key === 'Home' ? 0 : event.key === 'End' ? last : index + direction
  while (next >= 0 && next <= last && is_agenda_contact_disabled(matching_contacts.value[next]!)) next += direction
  if (next < 0 || next > last) return
  focused_index.value = next
  virtualizer.value.scrollToIndex(next, { align: 'auto' })
  await nextTick()
  list.value?.querySelector<HTMLInputElement>(`[data-index="${next}"] input[type="checkbox"]`)?.focus()
}

onMounted(() => {
  page.value = list.value?.closest<HTMLElement>('.page-content') ?? null
  measure_agenda_list()
  if (typeof ResizeObserver !== 'undefined' && page.value) {
    page_observer = new ResizeObserver(measure_agenda_list)
    page_observer.observe(page.value)
    const actions = page.value.querySelector('.agenda-selection-actions')
    if (actions) page_observer.observe(actions)
  }
  window.addEventListener('keydown', focus_agenda_search)
})
onBeforeUnmount(() => {
  page_observer?.disconnect()
  window.removeEventListener('keydown', focus_agenda_search)
})
</script>

<template>
  <label class="agenda-search">
    <span class="sr-only">Buscar contatos por nome</span>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg>
    <input ref="search_input" v-model="search" type="search" placeholder="Buscar por nome" @input="focused_index = null">
  </label>
  <p id="agenda-keyboard-help" class="sr-only">Use as setas para percorrer a lista e Espaço para marcar. A tecla / abre a busca.</p>
  <p v-if="!matching_contacts.length" class="handwritten-note" role="status">ninguém com “{{ search.trim() }}” por aqui.</p>
  <ul ref="list" class="agenda-contact-list" aria-label="Contatos da agenda" :style="{ height: `${virtualizer.getTotalSize()}px` }">
    <li v-for="{ row, contact } in visible_rows" :key="contact.id" :ref="measure_agenda_contact_row"
      :data-index="row.index" :aria-posinset="row.index + 1" :aria-setsize="matching_contacts.length"
      :style="{ transform: `translateY(${row.start - scroll_margin}px)` }">
      <label class="agenda-contact-choice" :class="{ selected: agenda_import_state.selected_ids.has(contact.id) }">
        <input type="checkbox" :value="contact.id" :aria-label="`Importar ${contact.name}`" :aria-describedby="`agenda-meta-${contact.id} agenda-keyboard-help`"
          :checked="agenda_import_state.selected_ids.has(contact.id)"
          :disabled="is_agenda_contact_disabled(contact)"
          @change="set_agenda_contact_selection(contact, ($event.target as HTMLInputElement).checked)"
          @focus="focused_index = row.index" @keydown="focus_agenda_contact_for_keyboard($event, row.index)">
        <span class="agenda-contact-information">
          <span class="agenda-contact-name">{{ contact.name }}</span>
          <span :id="`agenda-meta-${contact.id}`" class="agenda-contact-meta">
            {{ contact.phone ? format_phone_for_display(contact.phone) : 'sem telefone' }}<template v-if="contact.birthday"> · {{ format_birthday_for_display(contact.birthday) }}</template>
            <span v-if="agenda_import_state.saved_contact_ids.has(contact.id) || get_duplicate_friend_for_agenda_contact(contact)" class="agenda-duplicate">Já no caderno</span>
            <span v-else-if="get_duplicate_selected_agenda_contact(contact)" class="agenda-duplicate">Mesmo telefone de {{ get_duplicate_selected_agenda_contact(contact)?.name }} na seleção</span>
            <span v-if="contact.source_count > 1" class="agenda-source-count">{{ contact.source_count }} iguais no arquivo</span>
          </span>
        </span>
      </label>
      <label v-if="contact.phones.length > 1" class="agenda-phone-choice">
        <span>Qual número entra?</span>
        <select :value="contact.phone" :aria-label="`Telefone de ${contact.name}`" :disabled="agenda_import_state.saved_contact_ids.has(contact.id)"
          @change="set_phone_for_agenda_contact(contact, ($event.target as HTMLSelectElement).value)">
          <option v-for="phone in contact.phones" :key="phone.number" :value="phone.number">{{ format_phone_for_display(phone.number) }}</option>
        </select>
      </label>
    </li>
  </ul>
</template>

<style scoped>
.agenda-search{display:flex;align-items:center;gap:.75rem;min-height:calc(var(--notebook-line) * 2);margin:var(--notebook-line) 0}
.agenda-search svg{flex:none;width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.75}
.agenda-search input{min-width:0;width:100%;height:3rem;padding:0 .25rem;border:0;border-radius:0;background:transparent;border-bottom:1.5px solid var(--neutral-500);font:400 1rem/var(--notebook-line) var(--font-ui);color:var(--ink)}
.agenda-search input::placeholder{color:var(--neutral-600)}
.agenda-search input:focus{box-shadow:none;border-bottom:3px solid var(--focus);background:var(--highlight-50);outline:none} /* impeccable-disable-line border-accent-on-rounded -- this underlined input has border-radius:0 */
.agenda-contact-list{position:relative;list-style:none;margin:0;padding:0}
.agenda-contact-list>li{position:absolute;top:0;left:0;width:100%;padding:0 0 var(--notebook-line);box-sizing:border-box}
.agenda-contact-choice{display:grid;grid-template-columns:2.75rem minmax(0,1fr);align-items:start;min-height:calc(var(--notebook-line) * 2);cursor:pointer}
.agenda-contact-choice.selected{background:var(--highlight-50)}
.agenda-contact-choice>input{width:1.125rem;height:1.125rem;margin:.4375rem .8125rem;accent-color:var(--primary);cursor:pointer}
.agenda-contact-choice:has(>input:focus-visible){box-shadow:var(--focus-ring);border-radius:var(--radius-sm)}
.agenda-contact-choice>input:disabled{cursor:default}
.agenda-contact-name{display:block;font:600 1.1875rem/var(--notebook-line) var(--font-title);overflow-wrap:anywhere}
.agenda-contact-meta{display:block;font:400 .875rem/var(--notebook-line) var(--font-ui);font-variant-numeric:tabular-nums;color:var(--neutral-600);overflow-wrap:anywhere}
.agenda-duplicate{display:block;width:fit-content;padding:0 .375rem;background:var(--paper);color:var(--neutral-700);border:1px dashed var(--neutral-500);border-radius:var(--radius-sm);font-weight:600}
.agenda-source-count{display:block}
.agenda-phone-choice{display:block;margin-left:2.75rem;color:var(--neutral-700);font:400 .875rem/var(--notebook-line) var(--font-ui)}
.agenda-phone-choice select{display:block;box-sizing:border-box;max-width:100%;min-height:2.75rem;padding:.25rem;border:1px solid var(--neutral-500);border-radius:var(--radius-sm);background:var(--sheet);color:var(--ink);font:400 1rem/var(--notebook-line) var(--font-ui);font-variant-numeric:tabular-nums}
</style>
