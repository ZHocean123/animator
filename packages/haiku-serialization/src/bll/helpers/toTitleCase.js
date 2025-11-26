module.exports = function toTitleCase(str) {
  return (`${str}`).split(/[^A-Z0-9]/i).join(' ').replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  })
}
