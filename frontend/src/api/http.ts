const CSRF_COOKIE_NAME = 'csrftoken'
const CSRF_HEADER_NAME = 'X-CSRFToken'
const WRITE_METHODS = new Set(['POST', 'PATCH', 'DELETE'])
const NO_CONTENT_STATUS = 204

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function get_csrf_token_for_request(): string | undefined {
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(`${CSRF_COOKIE_NAME}=`))
  return cookie ? decodeURIComponent(cookie.slice(CSRF_COOKIE_NAME.length + 1)) : undefined
}

function get_error_detail_for_browser(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('errors' in body) || !Array.isArray(body.errors)) {
    return undefined
  }
  const firstError: unknown = body.errors[0]
  if (typeof firstError !== 'object' || firstError === null || !('detail' in firstError)) {
    return undefined
  }
  return typeof firstError.detail === 'string' ? firstError.detail : undefined
}

export async function send_api_request(
  path: string,
  { method = 'GET', body }: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: object } = {},
): Promise<unknown> {
  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (WRITE_METHODS.has(method)) {
    const csrfToken = get_csrf_token_for_request()
    if (csrfToken) headers[CSRF_HEADER_NAME] = csrfToken
  }

  const response = await fetch(path, {
    ...(method !== 'GET' ? { method } : {}),
    ...(body ? { body: JSON.stringify(body) } : {}),
    credentials: 'include',
    headers,
  })
  if (response.status === NO_CONTENT_STATUS) return null

  const responseBody: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, get_error_detail_for_browser(responseBody) ?? 'Não foi possível concluir a solicitação. Tente novamente.')
  }
  return responseBody
}
