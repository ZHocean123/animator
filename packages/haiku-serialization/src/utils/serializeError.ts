export default function serializeError(err?: (Error & { code?: string | number, type?: string }) | null) {
  if (!err)
    return null
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    type: err.type,
  }
}
