export default function isNumeric(n: any) {
  return !isNaN(Number.parseFloat(n)) && isFinite(n)
}
