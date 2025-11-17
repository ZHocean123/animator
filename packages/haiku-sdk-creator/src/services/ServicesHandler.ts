// @ts-ignore
import figmaModule from "haiku-serialization/src/bll/Figma.js";
const { Figma } = figmaModule;
import { ImportSpec, MaybeAsync, TokenExchange } from ".";

export interface Services {
  figmaImportSVG(importSpec: ImportSpec, authToken: string): MaybeAsync<void>;

  figmaGetAccessToken(tokenExchange: TokenExchange): MaybeAsync<object>;
}

export class ServicesHandler implements Services {
  figmaImportSVG(importSpec: ImportSpec, authToken: string): MaybeAsync<void> {
    const figma = new Figma({ token: authToken });
    return figma.importSVG(importSpec);
  }

  figmaGetAccessToken(tokenExchange: TokenExchange): MaybeAsync<object> {
    return Figma.getAccessToken(tokenExchange);
  }
}
