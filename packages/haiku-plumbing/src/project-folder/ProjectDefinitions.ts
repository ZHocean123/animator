
export * from '@haiku/sdk-client';
import * as moment from 'moment';

import {
  getProjectNameSafeShort,
} from '@haiku/sdk-client';

export const getEmbedName = (organizationName: string, projectName: string) => {
  return `HaikuComponentEmbed_${organizationName}_${getProjectNameSafeShort(projectName)}`;
};

export const getCurrentHumanTimestamp = () => {
  return moment().format('YYYYMMDDHHmmss');
};
