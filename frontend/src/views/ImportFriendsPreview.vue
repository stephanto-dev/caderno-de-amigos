<script setup lang="ts">
import { AgendaImportStep, agenda_import_state, selected_agenda_contacts, start_completing_agenda_contacts } from '../agenda-import'
import NewFriendDraft from '../components/NewFriendDraft.vue'

const MAX_PREVIEW_NAMES = 12
</script>

<template>
  <NewFriendDraft v-if="agenda_import_state.step === AgendaImportStep.COMPLETE" />
  <section v-else-if="agenda_import_state.step === AgendaImportStep.SELECT" class="agenda-preview">
    <h1 class="view-title">Prévia</h1>
    <p class="handwritten-note" aria-live="polite">{{ selected_agenda_contacts.length }} {{ selected_agenda_contacts.length === 1 ? 'selecionado' : 'selecionados' }}</p>
    <ul class="agenda-preview-names">
      <li v-for="contact in selected_agenda_contacts.slice(0, MAX_PREVIEW_NAMES)" :key="contact.id">{{ contact.name }}</li>
    </ul>
    <p v-if="selected_agenda_contacts.length > MAX_PREVIEW_NAMES">Mais {{ selected_agenda_contacts.length - MAX_PREVIEW_NAMES }} selecionados.</p>
    <p class="agenda-help">Depois você confere um por um: nome, telefone, aniversário, grupo e ritmo.</p>
    <button type="button" class="stamp-filled agenda-desktop-continue" :disabled="!selected_agenda_contacts.length || agenda_import_state.is_busy" @click="start_completing_agenda_contacts">
      {{ selected_agenda_contacts.length ? `Continuar com ${selected_agenda_contacts.length}` : 'Continuar' }}
    </button>
  </section>
  <section v-else class="agenda-preview">
    <h1 class="view-title">Como funciona</h1>
    <p class="handwritten-note">A agenda inteira não entra de uma vez.</p>
    <p class="agenda-help">Você escolhe os amigos e confere os dados antes de salvar.</p>
    <p class="agenda-help">Foto, e-mail, endereço e empresa ficam de fora. Só nome, telefone e aniversário, quando houver.</p>
  </section>
</template>

<style scoped>
.agenda-preview p{margin:0 0 var(--notebook-line)}
.agenda-preview-names{list-style:none;margin:0 0 var(--notebook-line);padding:0}
.agenda-preview-names li{font:600 1.1875rem/var(--notebook-line) var(--font-title);overflow-wrap:anywhere}
.agenda-help{color:var(--neutral-600)}
.agenda-desktop-continue{margin-top:var(--notebook-line)}
</style>
