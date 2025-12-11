import path from 'path';
import * as fse from 'haiku-fs-extra';
import Project from '../../src/bll/Project.js';
import Element from '../../src/bll/Element.js';

const TEXT_SVG = `<svg><text font-family="DontKnowDontCare" font-size="12">Hello friend.</text></svg>`;

test('File.readMana', async () => {
  const folder = path.join(__dirname, '..', 'fixtures', 'projects', 'file-readmana-01');
  fse.removeSync(folder);
  const websocket = {on: () => {}, send: () => {}, action: () => {}, connect: () => {}};
  const platform = {};
  const userconfig = {};
  const fileOptions = {doWriteToDisk: true, skipDiffLogging: true};
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
        fse.outputFileSync(path.join(folder, 'designs/Text.svg'), TEXT_SVG);
        const ac0 = project.getCurrentActiveComponent();
        ac0.instantiateComponent('designs/Text.svg', {}, {from: 'test'}, (err, mana) => {
          if (err) {
 reject(err);
return;
}
          const timelineProperties = ac0
            .fetchActiveBytecodeFile()
            .getReifiedBytecode()
            .timelines.Default[`haiku:${mana.children[0].attributes['haiku-id']}`];
          expect(timelineProperties.content).toEqual({0: {value: 'Hello friend.'}});
          expect(timelineProperties.fontSize).toEqual({0: {value: 12}});
          expect(
            timelineProperties.fontFamily,
          ).toEqual({0: {value: 'Helvetica, Arial, sans-serif'}});
          fse.removeSync(folder);
          resolve();
        });
      });
    });
  });
});
