// tslint:disable:no-namespace class-name
import { inkstone } from "@haiku/sdk-inkstone";
import { execSync } from "child_process";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as _ from "lodash-es";
import * as mkdirp from "mkdirp";
import * as os from "os";
import * as path from "path";
import { bootstrapSceneFilesSync } from "./bootstrapSceneFilesSync";

const HAIKU_HOME = path.join(os.homedir(), ".haiku");

export const FILE_PATHS: {
  HAIKU_HOME: string;
  AUTH_TOKEN: string;
  DOTENV: string;
} = {
  HAIKU_HOME,
  AUTH_TOKEN: path.join(HAIKU_HOME, "auth"),
  DOTENV: path.join(HAIKU_HOME, ".env")
};

export const ensureFolder = (folder: string): void => {
  mkdirp.sync(folder);
};

export const ensureHomeFolder = (): void => {
  ensureFolder(HAIKU_HOME);
};

export type HaikuDotEnv = {
  [key in string]: string;
};

const applyEnv = (env: HaikuDotEnv): void => {
  Object.assign(global.process.env, env);
  if (env.HAIKU_API) {
    inkstone.setConfig({ baseUrl: env.HAIKU_API });
  }
};

export namespace client {
  export const verboselyLog = (message: string, ...args: any[]): void => {
    if (clientConfig.verbose) {
      console.log(message, ...args);
    }
  };

  export const error = (err: any): void => {
    // TODO: elegantly handle errors
  };

  export class npm {
    static readPackageJson(
      pathIn: string = global.process.cwd() + "/package.json"
    ): any {
      return JSON.parse(fs.readFileSync(pathIn, "utf8"));
    }

    static writePackageJson(
      jsonObject: any,
      pathIn: string = global.process.cwd() + "/package.json"
    ): void {
      fs.writeFileSync(pathIn, JSON.stringify(jsonObject, undefined, 2));
    }
  }

  export class git {
    static cloneRepo(
      remote: string,
      pathIn: string,
      cb: (error?: any) => any
    ): void {
      let err;
      try {
        execSync(`git clone ${remote} ${pathIn}`);
      } catch (e) {
        err = e;
        client.verboselyLog("error cloning repository", e);
      }
      cb(err);
    }
  }

  export interface ClientConfig {
    verbose?: boolean;
  }

  const clientConfig: ClientConfig = {
    verbose: false
  };

  export function setConfig(newVals: ClientConfig): void {
    _.extend(clientConfig, newVals);
  }

  export class config {
    static getenv(): HaikuDotEnv {
      if (!fs.existsSync(FILE_PATHS.DOTENV)) {
        return {};
      }

      const env = dotenv.parse(fs.readFileSync(FILE_PATHS.DOTENV));
      applyEnv(env);
      return env;
    }

    static setenv(environmentVariables: HaikuDotEnv): HaikuDotEnv {
      const newenv = Object.assign(
        client.config.getenv(),
        environmentVariables
      );
      applyEnv(newenv);
      fs.writeFileSync(
        FILE_PATHS.DOTENV,
        Object.entries(newenv).reduce(
          (accumulator, [key, value]) => accumulator + `${key}="${value}"\n`,
          ""
        )
      );

      return newenv;
    }

    static getAuthToken(): string | undefined {
      if (fs.existsSync(FILE_PATHS.AUTH_TOKEN)) {
        const token = fs.readFileSync(FILE_PATHS.AUTH_TOKEN).toString();
        return token;
      }
      return undefined;
    }

    static setAuthToken(newToken: string): void {
      ensureHomeFolder();
      fs.writeFileSync(FILE_PATHS.AUTH_TOKEN, newToken);
    }
  }
}

// Export bootstrapSceneFilesSync function
export { bootstrapSceneFilesSync };
