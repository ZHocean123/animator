export default function ensureTrailingSlash(str: string): string {
  return str[str.length - 1] === '/' ? str : `${str}/`
}
