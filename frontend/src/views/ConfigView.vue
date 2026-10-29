<script setup lang="ts">
import { useRouter } from 'vue-router'
import { auth_state, logout_user_for_browser } from '../auth'

const router = useRouter()

async function send_logout_for_browser(): Promise<void> {
  if (await logout_user_for_browser()) await router.replace('/entrar')
}
</script>

<template>
  <div class="config-view">
    <h1 class="view-title">Configurações</h1>
    <section class="account-section" aria-label="Conta">
      <h2>Conta</h2>
      <div class="account-details">
        <p v-if="auth_state.current_email" class="account-email">
          <span>E-mail</span>
          <span>{{ auth_state.current_email }}</span>
        </p>
        <button class="stamp" name="logout" :aria-busy="auth_state.is_loading" type="button" :disabled="auth_state.is_loading" @click="send_logout_for_browser">Sair</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.view-title { overflow-wrap: anywhere; }
.account-section { margin-top: var(--notebook-line); }
.account-section h2 { margin: 0 0 var(--notebook-line); font: 600 1.1875rem/var(--notebook-line) var(--font-title); }
.account-details { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; gap: var(--notebook-line); }
.account-email { display: flex; min-width: 0; max-width: 100%; flex-direction: column; margin: 0; font: 400 1rem/var(--notebook-line) var(--font-ui); }
.account-email span:first-child { font: 700 1.375rem/var(--notebook-line) var(--font-handwriting); color: var(--pen-ink); }
.account-details .stamp { min-width: 2.75rem; min-height: 3rem; height: auto; padding: .5rem 1rem; font-size: 1.625rem; line-height: var(--notebook-line); }
.account-email span:last-child { color: var(--ink); overflow-wrap: anywhere; }
</style>
