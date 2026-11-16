import { AgendaReadErrorCode, AgendaReadException, check_agenda_file_for_import } from './agenda'
import type { AgendaWorkerResponse } from './agenda'
import { read_agenda_contacts_for_file } from './agenda-file'

/** Read one file in a disposable worker; never echo file contents in errors. */
self.addEventListener('message', async (event: MessageEvent<File>): Promise<void> => {
  let response: AgendaWorkerResponse
  try {
    check_agenda_file_for_import(event.data)
    const bytes = new Uint8Array(await event.data.arrayBuffer())
    response = { result: read_agenda_contacts_for_file(event.data.name, bytes) }
  } catch (error) {
    response = { error: error instanceof AgendaReadException ? error.code : AgendaReadErrorCode.READ_FAILED }
  }
  self.postMessage(response)
})
