<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth_state, login_user_for_browser, register_user_for_browser } from '../auth'

const SPIRAL_RING_COUNT = 12
const email = ref('')
const password = ref('')
const password_confirm = ref('')
const route = useRoute()
const router = useRouter()
const is_register = computed(() => route.query.modo === 'criar')

watch(is_register, () => {
  auth_state.error = null
  auth_state.error_field = null
  password.value = ''
  password_confirm.value = ''
})

async function send_account_for_browser(): Promise<void> {
  const succeeded = is_register.value
    ? await register_user_for_browser(email.value, password.value, password_confirm.value)
    : await login_user_for_browser(email.value, password.value)
  if (succeeded) await router.replace('/quadro')
}
</script>

<template>
  <main class="cover-scene">
    <div class="notebook">
      <div class="page-block" aria-hidden="true"></div>
      <div class="cover">
        <div class="cover-spiral" aria-hidden="true">
          <span v-for="ring in SPIRAL_RING_COUNT" :key="ring" class="ring"></span>
        </div>
        <header class="cover-heading">
          <h1>Caderno de amigos</h1>
          <p>seu ritmo com as pessoas que importam</p>
        </header>
        <form class="cover-label" :aria-busy="auth_state.is_loading" @submit.prevent="send_account_for_browser">
          <span class="cover-tape" aria-hidden="true"></span>
          <nav class="mode-links" aria-label="Modo da conta">
            <RouterLink to="/entrar?modo=entrar" :aria-current="!is_register ? 'page' : undefined">Entrar</RouterLink>
            <RouterLink to="/entrar?modo=criar" :aria-current="is_register ? 'page' : undefined">Criar conta</RouterLink>
          </nav>

          <div class="form-fields">
            <div class="form-field">
              <label for="email">E-mail</label>
              <input id="email" v-model="email" name="email" type="email" autocomplete="email" required
                :aria-invalid="auth_state.error_field === 'email' ? 'true' : undefined"
                :aria-describedby="auth_state.error_field === 'email' ? 'email-error' : undefined">
              <p v-if="auth_state.error_field === 'email'" id="email-error" class="field-error" role="alert">{{ auth_state.error }}</p>
            </div>

            <div class="form-field">
              <label for="password">Senha</label>
              <input id="password" v-model="password" name="password" type="password"
                :autocomplete="is_register ? 'new-password' : 'current-password'" required
                :aria-invalid="auth_state.error_field === 'password' ? 'true' : undefined"
                :aria-describedby="auth_state.error_field === 'password' ? 'password-error' : undefined">
              <p v-if="auth_state.error_field === 'password'" id="password-error" class="field-error" role="alert">{{ auth_state.error }}</p>
            </div>

            <div v-if="is_register" class="form-field">
              <label for="password_confirm">Repetir senha</label>
              <input id="password_confirm" v-model="password_confirm" name="password_confirm"
                type="password" autocomplete="new-password" required
                :aria-invalid="auth_state.error_field === 'password_confirm' ? 'true' : undefined"
                :aria-describedby="auth_state.error_field === 'password_confirm' ? 'password-confirm-error' : undefined">
              <p v-if="auth_state.error_field === 'password_confirm'" id="password-confirm-error" class="field-error" role="alert">{{ auth_state.error }}</p>
            </div>
            <p v-if="auth_state.error && !auth_state.error_field" class="form-error" role="alert">{{ auth_state.error }}</p>
          </div>

          <div class="form-actions">
            <button type="submit" :disabled="auth_state.is_loading">
              {{ auth_state.is_loading ? (is_register ? 'Criando…' : 'Entrando…') : (is_register ? 'Criar conta' : 'Entrar') }}
            </button>
            <RouterLink :to="is_register ? '/entrar?modo=entrar' : '/entrar?modo=criar'" class="switch-link">
              {{ is_register ? 'Já tenho conta' : 'Criar conta' }}
            </RouterLink>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<style scoped>
.cover-scene {
  box-sizing: border-box;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 20px 18px;
  background: var(--desk);
}
.notebook {
  position: relative;
  /* The approved v4 dimensions grew after feedback that the cover felt too small. */
  width: min(400px, calc(100vw - 40px));
  height: min(620px, calc(100dvh - 40px));
  min-height: 520px;
  filter: drop-shadow(0 28px 40px rgba(0, 0, 0, .4));
}
.page-block {
  position: absolute;
  z-index: 0;
  top: 8px;
  right: -14px;
  bottom: 8px;
  width: 14px;
  border: 1px solid rgba(43, 36, 32, .22);
  border-left: 0;
  border-radius: 0 3px 3px 0;
  background: repeating-linear-gradient(to bottom, var(--sheet) 0 1px, var(--neutral-100) 1px 2px, var(--paper) 2px 3px, var(--neutral-300) 3px 4px);
}
.cover {
  box-sizing: border-box;
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 16px 18px 34px;
  border: 1px solid rgba(43, 36, 32, .4);
  border-radius: 6px 10px 10px 6px;
  background: linear-gradient(155deg, var(--neutral-300), var(--neutral-400) 62%);
  box-shadow: inset -10px 0 18px -12px rgba(43, 36, 32, .2), 0 12px 20px rgba(0, 0, 0, .24);
}
.cover::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 24px;
  width: 2px;
  background: rgba(43, 36, 32, .14);
}
.cover-spiral {
  position: absolute;
  z-index: 3;
  top: 16px;
  bottom: 16px;
  left: -6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}
.ring { position: relative; display: block; width: 30px; height: 15px; }
.ring::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 15px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--neutral-900);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, .6);
}
.ring::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 3.5px solid #b0b0b0;
  border-top-color: #e8e8e8;
  border-right-color: #8a8a8a;
  border-bottom-color: #6e6e6e;
  border-radius: 50%;
  box-shadow: 0 2px 2px rgba(0, 0, 0, .35);
}
.cover-heading { position: relative; text-align: center; }
.cover-heading h1 {
  margin: 0;
  color: var(--ink);
  font: 700 clamp(1.35rem, 4.8vw, 1.75rem)/1.15 var(--font-title);
}
.cover-heading p {
  margin: 4px 0 0;
  color: var(--pen-ink);
  font: 500 clamp(1rem, 3.2vw, 1.2rem)/1.2 var(--font-handwriting);
}
.cover-label {
  box-sizing: border-box;
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 16px 12px 12px;
  border: 2px solid var(--ink);
  border-radius: var(--radius-md);
  background: var(--paper);
  box-shadow: var(--shadow-paper);
}
.cover-tape {
  position: absolute;
  top: -9px;
  left: calc(50% - 32px);
  width: 64px;
  height: 16px;
  background: linear-gradient(90deg, var(--highlight-50), var(--highlight), var(--highlight-50));
  pointer-events: none;
}
.mode-links { display: flex; justify-content: center; gap: 16px; }
.mode-links a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  color: var(--neutral-700);
  font: 700 1.25rem/1 var(--font-handwriting);
  text-decoration: none;
  border-bottom: 2px solid transparent;
}
.mode-links a[aria-current] { color: var(--primary-700); border-bottom-color: var(--primary-700); }
.form-fields { flex: 1; min-height: 0; padding-top: 8px; }
.form-field { margin-bottom: 6px; }
.form-field label { display: block; margin-bottom: 3px; font: 500 .9rem/1.2 var(--font-ui); }
.form-field input {
  box-sizing: border-box;
  width: 100%;
  height: 44px;
  padding: 0 10px;
  border: 1.5px solid var(--ink);
  border-radius: var(--radius-sm);
  background: var(--sheet);
  color: var(--ink);
  font: 400 1rem/1 var(--font-ui);
}
.form-field input:focus-visible, .mode-links a:focus-visible, .form-actions :focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.form-field input[aria-invalid] { border-color: var(--error); }
.field-error, .form-error {
  margin: 3px 0 0;
  color: var(--error);
  font: 400 .8rem/1.25 var(--font-ui);
}
.form-actions { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.form-actions button {
  min-width: 140px;
  min-height: 44px;
  padding: 0 20px;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: #fff;
  font: 600 .9rem/1 var(--font-ui);
  cursor: pointer;
}
.form-actions button:hover:not(:disabled) { background: var(--primary-hover); }
.form-actions button:disabled { opacity: .55; cursor: wait; }
.switch-link {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  color: var(--neutral-700);
  font: 500 .8rem/1 var(--font-ui);
  text-underline-offset: 3px;
}
@media (min-width: 768px) {
  .notebook { width: 480px; height: min(700px, calc(100dvh - 40px)); min-height: 560px; }
  .cover { padding: 22px 22px 22px 40px; gap: 10px; }
  .cover-heading h1 { font-size: 1.9rem; }
  .cover-heading p { font-size: 1.25rem; }
}
@media (max-width: 400px) {
  .notebook { height: min(580px, calc(100dvh - 40px)); min-height: 500px; }
  .cover { padding: 14px 12px 14px 30px; gap: 6px; }
  .cover-heading h1 { font-size: 1.3rem; }
  .cover-label { padding: 10px 8px 8px; }
  .form-field input { height: 40px; }
}
</style>
