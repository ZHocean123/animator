/**
 * Copyright (c) Haiku 2016-2018. All rights reserved.
 */

/**
 * Returns true iff a transform value is "essentially" a specified basis int.
 */
export function transformValueIsEssentiallyInt(transformValue: number, basis: number): boolean {
  return Math.abs(transformValue - basis) < 1e-6
}
