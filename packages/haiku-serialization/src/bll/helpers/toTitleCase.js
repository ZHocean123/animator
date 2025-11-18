/**
 * Converts a string to title case
 * @param {string} str - The string to convert
 * @returns {string} - The title case string
 */
export default function toTitleCase(str) {
  return (str + '').split(/[^A-Za-z0-9]/).join(' ').replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}
