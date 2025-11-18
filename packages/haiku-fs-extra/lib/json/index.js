import jsonFile from './jsonfile.js'
import outputJsonSync from './output-json-sync.js'
import outputJson from './output-json.js'

jsonFile.outputJsonSync = outputJsonSync
jsonFile.outputJson = outputJson
// aliases
jsonFile.outputJSONSync = outputJsonSync
jsonFile.outputJSON = outputJson

export default jsonFile
