/**
 * Serializes an error object to a plain object
 * @param {Error} err - The error object to serialize
 * @returns {Object|null} - The serialized error object or null if no error
 */
export default function serializeError(err) {
  if(!err) {
    return null;
  }
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    type: err.type,
  };
}
