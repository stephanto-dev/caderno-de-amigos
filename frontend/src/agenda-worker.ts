import { AgendaReadErrorCode, AgendaReadException, check_agenda_file_for_import } from './agenda'
import type { AgendaImportResult, AgendaWorkerResponse } from './agenda'

/** Read a local file off the UI thread, releasing the worker on success, error or exit. */
export async function read_agenda_for_import(file: File, signal?: AbortSignal): Promise<AgendaImportResult> {
  check_agenda_file_for_import(file)
  if (signal?.aborted) throw new DOMException('Agenda reading cancelled', 'AbortError')
  return new Promise((complete, fail) => {
    let worker: Worker
    try { worker = new Worker(new URL('./agenda.worker.ts', import.meta.url), { type: 'module' }) } catch {
      fail(new AgendaReadException(AgendaReadErrorCode.READ_FAILED))
      return
    }
    const stop_reading_agenda = (): void => {
      worker.terminate()
      signal?.removeEventListener('abort', cancel_agenda_reading)
    }
    const cancel_agenda_reading = (): void => {
      stop_reading_agenda()
      fail(new DOMException('Agenda reading cancelled', 'AbortError'))
    }
    signal?.addEventListener('abort', cancel_agenda_reading, { once: true })
    worker.onmessage = (event: MessageEvent<AgendaWorkerResponse>): void => {
      stop_reading_agenda()
      if ('error' in event.data) fail(new AgendaReadException(event.data.error))
      else complete(event.data.result)
    }
    worker.onerror = (): void => {
      stop_reading_agenda()
      fail(new AgendaReadException(AgendaReadErrorCode.READ_FAILED))
    }
    try { worker.postMessage(file) } catch {
      stop_reading_agenda()
      fail(new AgendaReadException(AgendaReadErrorCode.READ_FAILED))
    }
  })
}
