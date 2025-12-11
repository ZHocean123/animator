import path from 'path';
import * as fse from 'haiku-fs-extra';
import Project from '../../src/bll/Project.js';

test('Project', async () => {
  const folder = path.join(__dirname, '..', 'fixtures', 'projects', 'project-01');
  fse.removeSync(folder);
  const websocket = {on: () => {}, send: () => {}, action: () => {}, connect: () => {}};
  const platform = {};
  const userconfig = {};
  const fileOptions = {doWriteToDisk: true, skipDiffLogging: false};
  const envoyOptions = {mock: true};
  await new Promise((resolve, reject) => {
    Project.setup(folder, 'test', websocket, platform, userconfig, fileOptions, envoyOptions, (err, project) => {
      if (err) {
 reject(err);
return;
}
      project.setCurrentActiveComponent('main', {from: 'test'}, (err) => {
        if (err) {
 reject(err);
return;
}
        expect(project.getMetadata()).toEqual({from: 'test', alias: 'test'});
        expect(project.getFileOptions()).toEqual(fileOptions);
        expect(project.getEnvoyOptions()).toEqual(envoyOptions);
        expect(project.getFolder()).toEqual(folder);
        expect(project.getAlias()).toBe('test');
        expect(project.buildFileUid('foo/bar/baz.js').endsWith('haiku-serialization/test/fixtures/projects/project-01/foo/bar/baz.js')).toBeTruthy();
        expect(project.getPlatform().haiku.registry[project.buildFileUid('code/main/code.js')]).toBeTruthy();
        expect(project.getEnvoyClient()).toBeTruthy();
        websocket.send = () => {};

        const ac1 = project.findActiveComponentBySceneName('main');
        expect(ac1).toBeTruthy();
        const ac2 = project.getCurrentActiveComponent();
        expect(ac2).toBeTruthy();

        project.setCurrentActiveComponent('meow_meow', {from: 'test'}, (err, ac) => {
          if (err) {
 reject(err);
return;
}
          expect(ac).toBeTruthy();
          expect(ac.getReifiedBytecode().metadata.relpath).toBe('code/meow_meow/code.js');
          fse.removeSync(folder);
          resolve();
        });
      });
    });
  });
});
