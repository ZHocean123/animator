let slack = (await import("slack"));
let log = (await import("./log"));
let deploy = (await import("./../deploy"));

export default function shout (options, text, cb) {
  if (options && options.shout) {
    return slack.chat.postMessage({
      text,
      token: deploy.slack.legacy,
      channel: 'releases',
      username: 'Haiku Distro',
      icon_emoji: ':jenkins:',
    }, (err) => {
      if (err) {
        log.err(err);
      }
      return cb();
    });
  }
  return cb();
};
