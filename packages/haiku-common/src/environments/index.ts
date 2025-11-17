/**
 * Runtime environment.
 * @enum {string}
 */
export const enum Environment {
  Test = 'test',
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
}

/**
 * Runtime environment type.
 * @enum {string}
 */
export const enum EnvironmentType {
  Development = 'development',
  Production = 'production',
}

/**
 * Canonical method to retrieve the current environment.
 *
 * If no environment is provided as an environment variable, assume production.
 */
export const getEnvironment = (): string => global.process.env.NODE_ENV || Environment.Production;

/**
 * Gets the environment type.
 */
export const getEnvironmentType = (): EnvironmentType => {
  const environment = getEnvironment();
  return (environment === Environment.Staging || environment === Environment.Production)
    ? EnvironmentType.Production
    : EnvironmentType.Development;
};

export const isProduction = (): boolean => getEnvironmentType() === EnvironmentType.Production;
export const isDevelopment = (): boolean => getEnvironmentType() === EnvironmentType.Development;

export const getUrl = (path: string): string => `${global.process.env.HAIKU_WWW || 'https://www.haiku.ai/'}${path}`;
export const getAccountUrl = (path: string): string =>
  `${global.process.env.HAIKU_ACCOUNT || 'https://account.haiku.ai/'}${path}`;

export const shouldEmitErrors = (): boolean => isProduction() || global.process.env.DEBUG_SENTRY === '1';
