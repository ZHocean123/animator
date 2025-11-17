// @ts-ignore
import * as LoggerInstance from "haiku-serialization/src/utils/LoggerInstance.js";

export type EnvoyLogLevel = "info" | "log" | "warn" | "error";

export default class EnvoyLogger implements Console {
  // tslint:disable-next-line:variable-name
  Console: any;
  memory: any;

  constructor(
    private readonly logLevel: EnvoyLogLevel,
    private readonly logger?: any
  ) {
    if (!this.logger) {
      this.logger = LoggerInstance;
    }
  }

  info(...args: any[]): void {
    if (this.logLevel === "info") {
      this.logger.info(...args);
    }
  }

  log(...args: any[]): void {
    if (this.logLevel === "info" || this.logLevel === "log") {
      this.logger.info(...args);
    }
  }

  warn(...args: any[]): void {
    if (
      this.logLevel === "info" ||
      this.logLevel === "log" ||
      this.logLevel === "warn"
    ) {
      this.logger.warn(...args);
    }
  }

  error(...args: any[]): void {
    this.logger.error(...args);
  }

  assert(...args: any[]): void {
    this.logger.assert(...args);
  }

  clear(): void {
    this.logger.clear();
  }

  count(...args: any[]): void {
    this.logger.count(...args);
  }

  countReset(label?: string): void {
    this.logger.countReset(label);
  }

  debug(...args: any[]): void {
    this.logger.debug(...args);
  }

  dir(...args: any[]): void {
    this.logger.dir(...args);
  }

  dirxml(arg: any[]): void {
    this.logger.dirxml(arg);
  }

  exception(...args: any[]): void {
    this.logger.exception(...args);
  }

  group(...args: any[]): void {
    this.logger.group(...args);
  }

  groupCollapsed(...args: any[]): void {
    this.logger.groupCollapsed(...args);
  }

  groupEnd(): void {
    this.logger.groupEnd();
  }

  markTimeline(label?: string): void {
    this.logger.markTimeline(label);
  }

  msIsIndependentlyComposed(element: any): void {
    this.logger.msIsIndependentlyComposed(element);
  }

  profile(...args: any[]): void {
    this.logger.profile(...args);
  }

  profileEnd(): void {
    this.logger.profileEnd();
  }

  select(arg: any): void {
    this.logger.select(arg);
  }

  table(...args: any[]): void {
    this.logger.table(...args);
  }

  time(...args: any[]): void {
    this.logger.time(...args);
  }

  timeEnd(...args: any[]): void {
    this.logger.timeEnd(...args);
  }

  timeLog(label?: string, ...data: any[]): void {
    this.logger.timeLog(label, ...data);
  }

  timeStamp(...args: any[]): void {
    this.logger.timeStamp(...args);
  }

  timeline(...args: any[]): void {
    this.logger.timeline(...args);
  }

  timelineEnd(...args: any[]): void {
    this.logger.timelineEnd(...args);
  }

  trace(...args: any[]): void {
    this.logger.trace(...args);
  }
}
