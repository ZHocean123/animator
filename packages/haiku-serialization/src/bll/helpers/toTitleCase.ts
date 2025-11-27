export default function toTitleCase(str: unknown): string {
  return (`${str}`).split(/[^A-Z0-9]/i).join(' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

export { toTitleCase }
