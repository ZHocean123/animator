import {
  getProjectNameSafeShort,
} from '@haiku/sdk-client'

import * as moment from 'moment'

export * from '@haiku/sdk-client'

export function getEmbedName(organizationName: string, projectName: string) {
  return `HaikuComponentEmbed_${organizationName}_${getProjectNameSafeShort(projectName)}`
}

export function getCurrentHumanTimestamp() {
  return moment().format('YYYYMMDDHHmmss')
}
