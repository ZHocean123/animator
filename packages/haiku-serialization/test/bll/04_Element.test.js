import path from 'path';
import async from 'async';
import fse from 'haiku-fs-extra';
import Project from '../../src/bll/Project.js';

test('Element', async () => {
  await new Promise((resolve, reject) => {
    setupTest((ac, bytecode, done) => {
      const el0 = ac.findElementByComponentId(bytecode.template.attributes['haiku-id']);
      const a1 = el0.getCompleteAddressableProperties();
      expect(a1).toBeTruthy();
      expect(a1['translation.x']).toBeTruthy();
      expect(a1['translation.x'].type).toBe('native');
      expect(a1['translation.x'].name).toBe('translation.x');
      expect(a1['translation.x'].prefix).toBe('translation');
      expect(a1['translation.x'].suffix).toBe('x');
      expect(a1['translation.x'].fallback).toBe(0);
      expect(a1['translation.x'].typedef).toBe('number');
      expect(a1['translation.x'].mock).toBeUndefined();
      expect(a1['translation.x'].value).toBeUndefined();
      expect(a1['translation.x'].cluster).toEqual({prefix: 'translation', name: 'Position'});
      done();
      resolve();
    });
  });
});

test('Element.buildClipboardPayload', async () => {
  await new Promise((resolve, reject) => {
    setupTest((ac, bytecode, done) => {
      const id = bytecode.template.attributes['haiku-id'];
      const element = ac.findElementByComponentId(id);
      ac.batchUpsertEventHandlers(`haiku:${id}`, SERIALIZED_EVENTS, {from: 'test'}, () => {
        const payload = element.buildClipboardPayload();

        expect(payload.kind).toBe('bytecode');
        expect(payload.data.eventHandlers).toBeTruthy();
        expect(payload.data.eventHandlers[`haiku:${id}`].click).toBeTruthy();
        expect(payload.data.eventHandlers[`haiku:${id}`].click.handler.__function).toBeTruthy();
        expect(payload.data.timelines).toBeTruthy();
        expect(payload.data.template).toBeTruthy();
        done();
        resolve();
      });
    });
  });
});

const setupTest = (doTest) => {
  const folder = path.join(__dirname, '..', 'fixtures', 'projects', 'element-getaddressables-01');
  fse.removeSync(folder);
  const bytecode = require(path.join(__dirname, '..', '..', '..', 'haiku-timeline', 'test', 'projects', 'complex', 'code', 'main', 'code.js'));
  const websocket = {on: () => {}, send: () => {}, action: () => {}, connect: () => {}};
  const platform = {};
  const userconfig = {};
  const fileOptions = {doWriteToDisk: true, skipDiffLogging: true};
  const envoyOptions = {mock: true};
  return Project.setup(folder, 'test', websocket, platform, userconfig, fileOptions, envoyOptions, (err, project) => {
    return project.setCurrentActiveComponent('main', {from: 'test'}, (err) => {
      if (err) {
        throw err;
      }
      const ac0 = project.getCurrentActiveComponent();
      return ac0.fetchActiveBytecodeFile().mod.update(bytecode, () => {
        return ac0.hardReload({}, {}, () => {
          return async.series([], (err) => {
            if (err) {
              throw err;
            }
            doTest(ac0, bytecode, () => {
              fse.removeSync(folder);
            });
          });
        });
      });
    });
  });
};

const SERIALIZED_EVENTS = {
  click: {
    handler: {
      __function: {
        params: ['component', 'element', 'target', 'event'],
        body: '/** action logic goes here */\nconsole.log(12);',
        type:'FunctionExpression',
        name:null,
      },
    },
  },
};
