/**
 * Copyright (c) Haiku 2016-2018. All rights reserved.
 */

import ReservedWords from './ReservedWords'

const WRAP_PREFIX = '_$'
const WRAP_SUFFIX = '$_'
const VALIDITY_REGEX = /(^[^a-z_$])|([^\w$])/gi

function charReplacer(c: string): string {
  return WRAP_PREFIX + c.charCodeAt(0) + WRAP_SUFFIX
}

function isInt(value) {
  return !isNaN(Number.parseInt(value, 10)) && Number.parseInt(value, 10) === Number.parseFloat(value)
}

/**
 * @function toIdentifier
 * @description Converts arbitrary text into a valid JavaScript identifier.
 * This operation should be reversible.
 */
export function toIdentifier(str: string): string {
  let out = str

  out = out.replace(VALIDITY_REGEX, charReplacer)

  if (ReservedWords.WORDS[out]) {
    return `${WRAP_PREFIX}${out}${WRAP_SUFFIX}`
  }

  return out
}

/**
 * @function toText
 * @description Inverse of toIdentifier
 */
export function toText(str: string): string {
  return str.replace(/_\$(\w+)\$_/g, (full) => {
    const part = full.slice(2, full.length - 2)
    // Ignore JavaScript keywords that we may have wrapped
    if (isInt(part)) {
      return String.fromCharCode(Number.parseInt(part, 10))
    }
    return part
  })
}
