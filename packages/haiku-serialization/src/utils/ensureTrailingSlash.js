/**
 * Ensures a string has a trailing slash
 * @param {string} str - The input string
 * @returns {string} - The string with trailing slash
 */
export default (str) => {
  return (str[str.length - 1] === '/')
    ? str
    : `${str}/`;
};
