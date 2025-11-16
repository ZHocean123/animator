


import log from "./log.js";

export default (command, commandAlias, attempts) => {
  let remainingTries = attempts;

  while (remainingTries > 0) {
    try {
      command();
      break;
    } catch (e) {
      log.err(`Encountered error during ${commandAlias}. Retrying....`);
      remainingTries--;
    }
  }

  if (remainingTries === 0) {
    throw new Error(`Unable to ${commandAlias} after ${attempts} attempts`);
  }
};
