import { reactive } from 'vue'
import { ApiError, send_api_request } from './api/http'

interface SessionStatus {
  authenticated: boolean
  user: string | null
  email: string | null
}

const UNAUTHORIZED_STATUS = 401
const FORBIDDEN_STATUS = 403
const TOO_MANY_REQUESTS_STATUS = 429

export const auth_state = reactive({
  current_user: null as string | null,
  current_email: null as string | null,
  is_loading: false,
  is_initialized: false,
  error: null as string | null,
})

function is_session_status(body: unknown): body is SessionStatus {
  return typeof body === 'object' && body !== null
    && 'authenticated' in body && typeof body.authenticated === 'boolean'
    && 'user' in body && (typeof body.user === 'string' || body.user === null)
    && 'email' in body && (typeof body.email === 'string' || body.email === null)
}

function get_error_message_for_browser(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === TOO_MANY_REQUESTS_STATUS) {
      return 'Muitas tentativas. Aguarde um minuto e tente novamente.'
    }
    if (error.status === UNAUTHORIZED_STATUS) return 'Sua sessão terminou. Entre novamente.'
    if (error.status === FORBIDDEN_STATUS) {
      return 'Sua sessão ou token de segurança não é válido. Atualize a página e tente novamente.'
    }
    return error.message
  }
  return 'Não foi possível conectar. Verifique sua conexão e tente novamente.'
}

export async function get_session_for_browser(): Promise<void> {
  auth_state.is_loading = true
  auth_state.error = null
  try {
    const session = await send_api_request('/api/me/')
    if (!is_session_status(session)) throw new Error('Invalid session response')
    auth_state.current_user = session.authenticated ? session.user : null
    auth_state.current_email = session.authenticated ? session.email : null
    auth_state.is_initialized = true
  } catch (error) {
    auth_state.current_user = null
    auth_state.current_email = null
    auth_state.error = get_error_message_for_browser(error)
    auth_state.is_initialized = error instanceof ApiError
      && [UNAUTHORIZED_STATUS, FORBIDDEN_STATUS].includes(error.status)
  } finally {
    auth_state.is_loading = false
  }
}

export async function login_user_for_browser(username: string, password: string): Promise<boolean> {
  auth_state.is_loading = true
  auth_state.error = null
  try {
    const session = await send_api_request('/api/login/', {
      method: 'POST',
      body: { username, password },
    })
    if (!is_session_status(session) || !session.authenticated || session.user === null) {
      throw new Error('Invalid login response')
    }
    auth_state.current_user = session.user
    auth_state.current_email = session.email
    auth_state.is_initialized = true
    return true
  } catch (error) {
    auth_state.current_user = null
    auth_state.current_email = null
    auth_state.error = get_error_message_for_browser(error)
    return false
  } finally {
    auth_state.is_loading = false
  }
}

export async function logout_user_for_browser(): Promise<boolean> {
  auth_state.is_loading = true
  auth_state.error = null
  try {
    await send_api_request('/api/logout/', { method: 'POST' })
    auth_state.current_user = null
    auth_state.current_email = null
    auth_state.is_initialized = true
    return true
  } catch (error) {
    auth_state.error = get_error_message_for_browser(error)
    return false
  } finally {
    auth_state.is_loading = false
  }
}
