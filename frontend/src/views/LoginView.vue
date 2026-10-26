<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth_state, login_user_for_browser } from '../auth'

const username = ref('')
const password = ref('')
const route = useRoute()
const router = useRouter()

async function send_login_for_browser(): Promise<void> {
  if (!await login_user_for_browser(username.value, password.value)) return
  const redirect = route.query.redirect
  const destination = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/'
  await router.replace(destination)
}
</script>

<template>
  <div class="login-view">
    <h1 class="view-title">Entrar</h1>
    <p>Seu caderno está esperando por você.</p>
    <form class="login-form" @submit.prevent="send_login_for_browser">
      <label for="username">Usuário</label>
      <input id="username" v-model="username" class="field" name="username" autocomplete="username" required />

      <label for="password">Senha</label>
      <input id="password" v-model="password" class="field" name="password" type="password" autocomplete="current-password" required />

      <p v-if="auth_state.error" class="login-error" role="alert">{{ auth_state.error }}</p>
      <button class="stamp" type="submit" :disabled="auth_state.is_loading">
        {{ auth_state.is_loading ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-view { max-width: 360px; }
.login-form { display: grid; gap: 8px; margin-top: 32px; }
.login-form label { font-weight: 600; }
.login-form .field { box-sizing: border-box; margin-bottom: 16px; }
.login-form .stamp { width: fit-content; margin-top: 8px; }
.login-error { margin: 0; color: var(--error); }
</style>
