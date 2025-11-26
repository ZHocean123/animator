// Business Logic Layer (BLL) exports
export {
  ERROR_CHANNEL,
  isUserlandCulprit,
  SentryReporter,
  type CrashMetadata,
  type SentryExtraData,
  type SentryCallbackData,
} from './bll/Error';

export {
  PROJECT_CHANNEL,
  ProjectError,
  ProjectSettings,
  type HaikuProject,
  ProjectHandler,
} from './bll/Project';

export {
  USER_CHANNEL,
  UserSettings,
  type HaikuIdentity,
  OrganizationPrivilege,
  UserHandler,
} from './bll/User';

// Exporter exports
export {
  ExporterFormat,
  type ExporterRequest,
} from './exporter';

export * from './exporter/ExporterHandler';

// Envoy exports
export {
  DatagramIntent,
  type EnvoySerializable,
  type ClientRequestCallback,
  type Datagram,
  type EnvoyOptions,
  DEFAULT_ENVOY_OPTIONS,
  type EnvoyEvent,
  type RequestOptions,
  DEFAULT_REQUEST_OPTIONS,
  type MaybeAsync,
} from './envoy';

export { default as EnvoyClient } from './envoy/EnvoyClient';
export * from './envoy/EnvoyLogger';
export * from './envoy/EnvoyServer';

// Tour exports
export {
  type Tour,
  type TourState,
  type ClientBoundingRect,
} from './tour';

export * from './tour/TourHandler';

// Services exports
export {
  SERVICES_CHANNEL,
  type ImportSpec,
  type TokenExchange,
} from './services';

export * from './services/ServicesHandler';

// Note: Some modules may need to be imported directly from their files:
// - codebase/* from './codebase/CodebaseManager' etc.
// - dal/* from './dal/Registry' etc.
// - glass/* from './glass/index' etc.
// - timeline/* from './timeline/index' etc.
// - utils/* from './utils/generateUUIDv4' etc.