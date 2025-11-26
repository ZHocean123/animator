import type { ImportSpec, MaybeAsync, TokenExchange } from '.'
// @ts-ignore
import { Figma } from 'haiku-serialization'

export interface Services {
  figmaImportSVG: (importSpec: ImportSpec, authToken: string) => MaybeAsync<void>

  figmaGetAccessToken: (tokenExchange: TokenExchange) => MaybeAsync<object>
}

export class ServicesHandler implements Services {
  figmaImportSVG(importSpec: ImportSpec, authToken: string) {
    const figma = new Figma({ token: authToken })
    return figma.importSVG(importSpec)
  }

  figmaGetAccessToken(tokenExchange: TokenExchange) {
    return Figma.getAccessToken(tokenExchange)
  }
}
