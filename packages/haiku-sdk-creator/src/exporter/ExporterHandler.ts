import type { ExporterRequest } from '.'
import type { UserHandler } from '../bll/User'
import type { EnvoyEvent, MaybeAsync } from '../envoy'
import type EnvoyServer from '../envoy/EnvoyServer'
import EnvoyHandler from '../envoy/EnvoyHandler'

export const EXPORTER_CHANNEL = 'exporter'

export class ExporterHandler extends EnvoyHandler {
  constructor(
    private readonly userHandler: UserHandler,
    protected readonly server: EnvoyServer,
  ) {
    super(server)
  }

  checkOfflinePrivileges(): MaybeAsync<boolean> {
    return this.userHandler.checkOfflinePrivileges()
  }

  save(request: ExporterRequest): MaybeAsync<void> {
    this.server.emit(EXPORTER_CHANNEL, {
      payload: request,
      name: `${EXPORTER_CHANNEL}:save`,
    } as EnvoyEvent)
  }

  trackProgress(request: ExporterRequest, progress = 0): MaybeAsync<void> {
    request.progress = progress
    this.server.emit(EXPORTER_CHANNEL, {
      payload: request,
      name: `${EXPORTER_CHANNEL}:progress`,
    })
  }

  saved(request: ExporterRequest): MaybeAsync<void> {
    this.trackProgress(request, 1)
    this.server.emit(EXPORTER_CHANNEL, {
      payload: request,
      name: `${EXPORTER_CHANNEL}:saved`,
    } as EnvoyEvent)
  }

  abort(request: ExporterRequest): MaybeAsync<void> {
    this.trackProgress(request, 0)
    this.server.emit(EXPORTER_CHANNEL, {
      payload: request,
      name: `${EXPORTER_CHANNEL}:abort`,
    } as EnvoyEvent)
  }
}
