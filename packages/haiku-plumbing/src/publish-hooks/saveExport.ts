import type { ExporterRequest } from 'haiku-sdk-creator'
// @ts-ignore
import type * as ActiveComponent from 'haiku-serializationbll/ActiveComponent'
import { handleExporterSaveRequest } from 'haiku-formats'
import { ExporterFormat } from 'haiku-sdk-creator'
// @ts-ignore
import * as Bytecode from 'haiku-serializationbll/Bytecode'

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
