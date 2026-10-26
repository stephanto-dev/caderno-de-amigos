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
      <div class="paper-surface account-card">
        <p v-if="auth_state.current_email" class="account-email">
          <span>E-mail</span>
          <span>{{ auth_state.current_email }}</span>
        </p>
        <button class="stamp" name="logout" type="button" :disabled="auth_state.is_loading" @click="send_logout_for_browser">Sair</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.account-section { margin-top: var(--notebook-line); }
.account-section h2 { margin: 0; color: var(--neutral-700); font: 400 16px/var(--notebook-line) var(--font-ui); }
.account-card { display: flex; flex-direction: column; align-items: flex-start; gap: var(--notebook-line); padding: 16px; }
.account-email { display: flex; flex-direction: column; margin: 0; color: var(--neutral-700); }
.account-email span:last-child { color: var(--ink); overflow-wrap: anywhere; }
</style>
