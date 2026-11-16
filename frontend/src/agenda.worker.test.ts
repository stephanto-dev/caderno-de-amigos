import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgendaReadErrorCode } from './agenda'
import type { AgendaWorkerResponse } from './agenda'

async function get_agenda_worker_for_test() {
  const postMessage = vi.fn<(response: AgendaWorkerResponse) => void>()
  const worker = Object.assign(new EventTarget(), { postMessage })
  vi.stubGlobal('self', worker)
  vi.resetModules()
  await import('./agenda.worker')
  return { worker, postMessage }
}

describe('Agenda worker entry', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

  it('reads local file bytes through the same public reader and posts only friend fields', async () => {
    const { worker, postMessage } = await get_agenda_worker_for_test()
    const file = new File(['Name\nAna'], 'contacts.csv')
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new TextEncoder().encode('Name\nAna').buffer })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    worker.dispatchEvent(new MessageEvent('message', { data: file }))

    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledOnce())
    expect(postMessage.mock.calls[0]![0]).toEqual({ result: {
      contacts: [{ id: '0', name: 'Ana', phone: null, birthday: null, phones: [], source_count: 1 }], skipped_without_name: 0,
    } })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reports file access failure without echoing personal data from the exception', async () => {
    const { worker, postMessage } = await get_agenda_worker_for_test()
    const file = new File(['private content'], 'contacts.csv')
    Object.defineProperty(file, 'arrayBuffer', { value: async () => { throw new Error('Private contact name') } })

    worker.dispatchEvent(new MessageEvent('message', { data: file }))

    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledOnce())
    expect(postMessage.mock.calls[0]![0]).toEqual({ error: AgendaReadErrorCode.READ_FAILED })
  })
})
