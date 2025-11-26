import type { ExporterRequest } from 'haiku-sdk-creator'
import type { ActiveComponent } from 'haiku-serialization'
import { handleExporterSaveRequest } from 'haiku-formats'
import { ExporterFormat } from 'haiku-sdk-creator'
import { Bytecode } from 'haiku-serialization'

export default (request: ExporterRequest, activeComponent: ActiveComponent, cb: (err: Error | void) => void) => {
  const bytecode = activeComponent.fetchActiveBytecodeFile().getReifiedDecycledBytecode({
    suppressSubcomponents: false,
  })

  // These formats are mutative (update bytecode in place), so we snapshot bytecode instead of using it directly.
  const doSnapshot = request.format === ExporterFormat.Bodymovin || request.format === ExporterFormat.HaikuStatic
  handleExporterSaveRequest(
    request,
    doSnapshot ? Bytecode.snapshot(bytecode) : bytecode,
    activeComponent.fetchActiveBytecodeFile().getFolder(),
  )
    .then(cb)
    .catch(cb)
}
