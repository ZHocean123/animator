export * from "@haiku/sdk-client/lib/ProjectDefinitions.js";
import moment from "moment";

import { getProjectNameSafeShort } from "@haiku/sdk-client/lib/ProjectDefinitions.js";

export const getEmbedName = (organizationName: string, projectName: string) => {
  return `HaikuComponentEmbed_${organizationName}_${getProjectNameSafeShort(
    projectName
  )}`;
};

export const getCurrentHumanTimestamp = () => {
  return moment().format("YYYYMMDDHHmmss");
};
