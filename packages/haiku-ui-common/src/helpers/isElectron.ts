function isElectron() {
  const userAgent = navigator.userAgent.toLowerCase()
  return userAgent.includes(' electron/')
}

export default isElectron
