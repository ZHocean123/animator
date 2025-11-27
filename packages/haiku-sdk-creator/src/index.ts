// Business Logic Layer (BLL) exports
export {
  type CrashMetadata,
  ERROR_CHANNEL,
  isUserlandCulprit,
  type SentryCallbackData,
  type SentryExtraData,
  SentryReporter,
} from './bll/Error'

export {
  type HaikuProject,
  PROJECT_CHANNEL,
  ProjectError,
  ProjectHandler,
  ProjectSettings,
} from './bll/Project'

export {
  type HaikuIdentity,
  OrganizationPrivilege,
  USER_CHANNEL,
  UserHandler,
  UserSettings,
} from './bll/User'

// Envoy exports
export {
  type ClientRequestCallback,
  type Datagram,
  DatagramIntent,
  DEFAULT_ENVOY_OPTIONS,
  DEFAULT_REQUEST_OPTIONS,
  type EnvoyEvent,
  type EnvoyOptions,
  type EnvoySerializable,
  type MaybeAsync,
  type RequestOptions,
} from './envoy'

export { default as EnvoyClient } from './envoy/EnvoyClient'

export { default as EnvoyLogger } from './envoy/EnvoyLogger'

export { default as EnvoyServer } from './envoy/EnvoyServer'
// Exporter exports
export {
  ExporterFormat,
  type ExporterRequest,
} from './exporter'
export * from './exporter/ExporterHandler'

export * from './glass/index'

// Services exports
export {
  type ImportSpec,
  SERVICES_CHANNEL,
  type TokenExchange,
} from './services'

export * from './services/ServicesHandler'

// Tour exports
export {
  type ClientBoundingRect,
  type Tour,
  type TourState,
} from './tour'
export * from './tour/TourHandler'

// Note: Some modules may need to be imported directly from their files:
// - codebase/* from './codebase/CodebaseManager' etc.
// - dal/* from './dal/Registry' etc.
// - glass/* from './glass/index' etc.
// - timeline/* from './timeline/index' etc.
// - utils/* from './utils/generateUUIDv4' etc.
