import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgendaReadErrorCode, MAX_AGENDA_FILE_BYTES } from './agenda'
import type { AgendaWorkerResponse } from './agenda'
import { read_agenda_for_import } from './agenda-worker'

const workers: AgendaWorkerForTest[] = []

class AgendaWorkerForTest {
  onmessage: ((event: MessageEvent<AgendaWorkerResponse>) => void) | null = null
  onerror: (() => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()

  constructor() { workers.push(this) }
}

describe('Agenda worker client', () => {
  beforeEach(() => {
    workers.length = 0
    vi.stubGlobal('Worker', AgendaWorkerForTest)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sends the File to a worker, returns its result and releases it after completion', async () => {
    const file = new File(['Name\nAna'], 'contacts.csv')
    const reading = read_agenda_for_import(file)
    const worker = workers[0]!
    const result = { contacts: [{ id: '0', name: 'Ana', phone: null, birthday: null, phones: [], source_count: 1 }], skipped_without_name: 0 }

    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith(file)
    worker.onmessage?.(new MessageEvent('message', { data: { result } }))

    expect(await reading).toEqual(result)
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it('rejects a large file before constructing a worker', async () => {
    const file = new File([new Uint8Array(MAX_AGENDA_FILE_BYTES + 1)], 'large.vcf')

    await expect(read_agenda_for_import(file)).rejects.toMatchObject({ code: AgendaReadErrorCode.TOO_LARGE })
    expect(workers).toHaveLength(0)
  })

  it('rejects an unsupported extension without sending it anywhere', async () => {
    await expect(read_agenda_for_import(new File(['Name\nAna'], 'contacts.txt'))).rejects.toMatchObject({ code: AgendaReadErrorCode.INVALID_FILE })
    expect(workers).toHaveLength(0)
  })

  it('preserves a useful reading error and terminates the worker', async () => {
    const reading = read_agenda_for_import(new File(['not a vCard'], 'contacts.vcf'))

    workers[0]!.onmessage?.(new MessageEvent('message', { data: { error: AgendaReadErrorCode.INVALID_FILE } }))

    await expect(reading).rejects.toMatchObject({ code: AgendaReadErrorCode.INVALID_FILE })
    expect(workers[0]!.terminate).toHaveBeenCalledOnce()
  })

  it('turns a worker crash into a recoverable reading error', async () => {
    const reading = read_agenda_for_import(new File(['Name\nAna'], 'contacts.csv'))

    workers[0]!.onerror?.()

    await expect(reading).rejects.toMatchObject({ code: AgendaReadErrorCode.READ_FAILED })
    expect(workers[0]!.terminate).toHaveBeenCalledOnce()
  })

  it('reports unavailable workers without pretending the file was invalid', async () => {
    vi.stubGlobal('Worker', class { constructor() { throw new Error('Worker blocked') } })

    await expect(read_agenda_for_import(new File(['Name\nAna'], 'contacts.csv'))).rejects.toMatchObject({ code: AgendaReadErrorCode.READ_FAILED })
  })

  it('cancels an in-flight read and removes its abort listener', async () => {
    const controller = new AbortController()
    const reading = read_agenda_for_import(new File(['Name\nAna'], 'contacts.csv'), controller.signal)

    controller.abort()

    await expect(reading).rejects.toMatchObject({ name: 'AbortError' })
    expect(workers[0]!.terminate).toHaveBeenCalledOnce()
  })

  it('does not start a read after the view has already exited', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(read_agenda_for_import(new File(['Name\nAna'], 'contacts.csv'), controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(workers).toHaveLength(0)
  })

  it('removes the listener after success so later cancellation has no effect', async () => {
    const controller = new AbortController()
    const reading = read_agenda_for_import(new File(['Name\nAna'], 'contacts.csv'), controller.signal)
    workers[0]!.onmessage?.(new MessageEvent('message', { data: { result: { contacts: [], skipped_without_name: 0 } } }))
    await reading

    controller.abort()

    expect(workers[0]!.terminate).toHaveBeenCalledOnce()
  })

  it('releases the worker when its message cannot be sent', async () => {
    vi.stubGlobal('Worker', class extends AgendaWorkerForTest {
      override postMessage = vi.fn(() => { throw new Error('Cannot clone File') })
    })

    await expect(read_agenda_for_import(new File(['Name\nAna'], 'contacts.csv'))).rejects.toMatchObject({ code: AgendaReadErrorCode.READ_FAILED })
    expect(workers[0]!.terminate).toHaveBeenCalledOnce()
  })
})
