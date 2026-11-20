<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import ContactForm from '../components/ContactForm.vue'
import type { ContactRecording } from '../api/friends'

const contact_announcement = ref('')

function set_recorded_contact_for_page(recording: ContactRecording): void {
  const count = recording.contacts.length
  contact_announcement.value = count === 1
    ? 'Contato registrado.'
    : `Contato registrado com ${count} amigos.`
}
</script>

<template>
  <div class="register-contact-view">
    <h1 class="view-title">Registrar contato</h1>
    <div class="contact-feedback">
      <p role="status">{{ contact_announcement }}</p>
      <RouterLink v-if="contact_announcement" to="/quadro">Ver quadro</RouterLink>
    </div>
    <ContactForm @recorded="set_recorded_contact_for_page" @submit.capture="contact_announcement = ''" />
  </div>
</template>

<style scoped>
.register-contact-view { max-width: 440px; }
.contact-feedback { display: flex; flex-wrap: wrap; align-items: center; gap: 0 12px; color: var(--neutral-700); font-size: .875rem; }
.contact-feedback p { margin: 0; }
.contact-feedback a { display: inline-flex; align-items: center; min-height: 44px; color: var(--primary-800); text-decoration: underline; text-underline-offset: 3px; }
</style>
