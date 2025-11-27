import * as CryptoJs from 'crypto-js'

export function aesDecrypt(str: string, passcode: string): string {
  return CryptoJs.AES.decrypt(str, passcode).toString(CryptoJs.enc.Utf8)
}

export function aesEncrypt(str: string, passcode: string): string {
  return CryptoJs.AES.encrypt(str, passcode).toString()
}

export function safeJsonStringify(
  objToStringify: unknown,
  maybeReplacer?: (this: any, key: string, value: any) => any,
  maybeSpacing?: number,
): string | null {
  try {
    return JSON.stringify(objToStringify as any, maybeReplacer, maybeSpacing)
  }
  catch {
    return null
  }
}

export function sha256(input: unknown): string | null {
  const jsonStr = safeJsonStringify(input)
  if (!jsonStr) {
    return null
  }
  return CryptoJs.SHA256(jsonStr).toString()
}

export default {
  aesEncrypt,
  aesDecrypt,
  sha256,
}
