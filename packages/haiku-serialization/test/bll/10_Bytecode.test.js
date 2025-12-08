
import Bytecode from './../../src/bll/Bytecode.js';

test('changeKeyframeValue', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
        'haiku:abcdefghijk': {
          opacity: {
            150: {
              value: 1,
            },
          },
        },
      },
    },
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };
  expect(JSON.stringify(bytecode.timelines.Default), '{"haiku:abcdefghijk":{"opacity":{"150":{"value":1}}}}');
  Bytecode.changeKeyframeValue(bytecode, 'abcdefghijk', 'Default', 'opacity', 150, 0.5);
  expect(JSON.stringify(bytecode.timelines.Default), '{"haiku:abcdefghijk":{"opacity":{"150":{"value":0.5,"edited":true}}}}');
});

test('changePlaybackSpeed', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {},
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{},"template":{"elementName":"svg","attributes":{"haiku-id":"abcdefghijk"}}}');
  Bytecode.changePlaybackSpeed(bytecode, 63);
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{},"template":{"elementName":"svg","attributes":{"haiku-id":"abcdefghijk"}},"options":{"fps":60}}');
});

test('changeSegmentCurve', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
        'haiku:abcdefghijk': {
          opacity: {
            0: {
              value: 0,
              curve: 'linear',
            },
            150: {
              value: 1,
            },
          },
        },
      },
    },
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };
  expect(JSON.stringify(bytecode.timelines.Default), '{"haiku:abcdefghijk":{"opacity":{"0":{"value":0,"curve":"linear"},"150":{"value":1}}}}');
  Bytecode.changeSegmentCurve(bytecode, 'abcdefghijk', 'Default', 'opacity', 0, 'easeOutBounce');
  expect(JSON.stringify(bytecode.timelines.Default), '{"haiku:abcdefghijk":{"opacity":{"0":{"value":0,"curve":"easeOutBounce","edited":true},"150":{"value":1}}}}');
});

test('componentIdToSelector', (t) => {
  expect(Bytecode.componentIdToSelector('abcd'), 'haiku:abcd');
});

test('createKeyframe (static 1)', (t) => {
  const bc1 = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
        'haiku:abcdefghijk': {

        },
      },
    },
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };
  Bytecode.createKeyframe(bc1, 'abcdefghijk', 'Default', 'svg', 'opacity', 150, 0.5);
  expect(JSON.stringify(bc1.timelines.Default), '{"haiku:abcdefghijk":{"opacity":{"150":{"value":0.5,"edited":true}}}}');
});

test('createKeyframe (dynamic 1)', (t) => {
  const bc2 = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
        'haiku:abcdefghijk': {

        },
      },
    },
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };

  Bytecode.createKeyframe(bc2, 'abcdefghijk', 'Default', 'svg', 'opacity', 150, {
    __function: {
      name: 'foo',
      params: [],
      body: 'return 123;',
    },
  });

  expect(bc2.timelines.Default['haiku:abcdefghijk'].opacity[150].value.toString(), 'function foo() {\n  return 123;\n}');
});

test('createKeyframe (dynamic via default 1)', (t) => {
  const bc3 = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
        'haiku:abcdefghijk': {
          opacity: {
            0: {
              value: function foo () {
                return 123;
              },
            },
          },
        },
      },
    },
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };

  Bytecode.createKeyframe(bc3, 'abcdefghijk', 'Default', 'svg', 'opacity', 150);

  expect(bc3.timelines.Default['haiku:abcdefghijk'].opacity[150].value.toString(), 'function foo() {\n  return 123;\n}');
});

test('createKeyframe (static via default 1)', (t) => {
  const bc4 = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
        'haiku:abcdefghijk': {
          opacity: {
            0: {
              value: 0.234,
            },
          },
        },
      },
    },
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };

  Bytecode.createKeyframe(bc4, 'abcdefghijk', 'Default', 'svg', 'opacity', 150);

  expect(bc4.timelines.Default['haiku:abcdefghijk'].opacity[150].value, 0.234);
});

test('createKeyframe (static via default 2)', (t) => {
  const bc4 = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
        'haiku:abcdefghijk': {
          opacity: {
            0: {
              value: 0.234,
            },
            140: {
              value: 0.675,
            },
          },
        },
      },
    },
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };

  Bytecode.createKeyframe(bc4, 'abcdefghijk', 'Default', 'svg', 'opacity', 150);

  expect(bc4.timelines.Default['haiku:abcdefghijk'].opacity[150].value, 0.675);
});

test('createTimeline', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
      },
    },
    template: {},
  };
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{"Default":{}},"template":{}}');
  Bytecode.createTimeline(bytecode, 'FooBar');
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{"Default":{},"FooBar":{}},"template":{}}');
});

test('deleteKeyframe', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
        'haiku:abcdefghijk': {
          foo: {
            0: {value: 1},
            100: {value: 2, curve: 'linear'},
            200: {value: 3, curve: 'linear'},
            300: {value: 4},
          },
        },
      },
    },
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };
  Bytecode.deleteKeyframe(bytecode, 'abcdefghijk', 'Default', 'foo', 200);
  expect(JSON.stringify(bytecode.timelines.Default), '{"haiku:abcdefghijk":{"foo":{"0":{"value":1},"100":{"value":2,"curve":"linear"},"300":{"value":4}}}}');
});

test('deleteTimeline', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
      },
      FooBar: {
      },
    },
    template: {},
  };
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{"Default":{},"FooBar":{}},"template":{}}');
  Bytecode.deleteTimeline(bytecode, 'FooBar');
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{"Default":{}},"template":{}}');
});

test('duplicateTimeline', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
      },
      FooBar: {
      },
    },
    template: {},
  };
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{"Default":{},"FooBar":{}},"template":{}}');
  Bytecode.duplicateTimeline(bytecode, 'FooBar');
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{"Default":{},"FooBar":{},"FooBar copy":{}},"template":{}}');
});

test('ensureTimeline', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
    },
    template: {},
  };
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{},"template":{}}');
  Bytecode.ensureTimeline(bytecode, 'FooBar');
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{"FooBar":{}},"template":{}}');
});

test('ensureTimelineGroup', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
    },
    template: {},
  };
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{},"template":{}}');
  Bytecode.ensureTimelineGroup(bytecode, 'FooBar', 'abcd');
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{"FooBar":{"haiku:abcd":{}}},"template":{}}');
});

test('ensureTimelineProperty', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
    },
    template: {},
  };
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{},"template":{}}');
  Bytecode.ensureTimelineProperty(bytecode, 'FooBar', 'abcd', 'opacity');
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{"FooBar":{"haiku:abcd":{"opacity":{}}}},"template":{}}');
});

test('getSortedKeyframeKeys', (t) => {
  const keys = Bytecode.getSortedKeyframeKeys({
    0: {value: 123},
    10: {value: 123},
    1000: {value: 123},
    44: {value: 123},
    346: {value: 123},
    2: {value: 123},
    100: {value: 123},
  });
  expect(JSON.stringify(keys), '[0,2,10,44,100,346,1000]');
});

test('joinKeyframes', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
        'haiku:abcdefghijk': {
          opacity: {
            0: {
              value: 0,
            },
            150: {
              value: 1,
            },
          },
        },
      },
    },
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };
  expect(JSON.stringify(bytecode.timelines.Default), '{"haiku:abcdefghijk":{"opacity":{"0":{"value":0},"150":{"value":1}}}}');
  Bytecode.joinKeyframes(bytecode, 'abcdefghijk', 'Default', 'svg', 'opacity', 0, 150, 'easeOutBounce');
  expect(JSON.stringify(bytecode.timelines.Default), '{"haiku:abcdefghijk":{"opacity":{"0":{"value":0,"curve":"easeOutBounce","edited":true},"150":{"value":1}}}}');
});

test('moveKeyframes', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
        'haiku:abcdefghijk': {
          opacity: {
            0: {
              value: 0,
              curve: 'linear',
            },
            150: {
              value: 1,
            },
          },
        },
      },
    },
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };
  expect(JSON.stringify(bytecode.timelines.Default), '{"haiku:abcdefghijk":{"opacity":{"0":{"value":0,"curve":"linear"},"150":{"value":1}}}}');
  Bytecode.moveKeyframes(bytecode, {
    Default: {
      abcdefghijk: {
        opacity: {
          0: {value: 1},
          150: {value: 3},
        },
      },
    },
  });
  expect(JSON.stringify(bytecode.timelines.Default), '{"haiku:abcdefghijk":{"opacity":{"0":{"value":1,"edited":true},"150":{"value":3,"edited":true}}}}');
});

test('renameTimeline', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
      },
      FooBar: {
      },
    },
    template: {},
  };
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{"Default":{},"FooBar":{}},"template":{}}');
  Bytecode.renameTimeline(bytecode, 'FooBar', 'BazQux');
  expect(JSON.stringify(bytecode), '{"states":{},"eventHandlers":{},"timelines":{"Default":{},"BazQux":{}},"template":{}}');
});

test('splitSegment', (t) => {
  const bytecode = {
    states: {},
    eventHandlers: {},
    timelines: {
      Default: {
        'haiku:abcdefghijk': {
          opacity: {
            0: {
              value: 0,
              curve: 'linear',
            },
            150: {
              value: 1,
            },
          },
        },
      },
    },
    template: {elementName: 'svg', attributes: {'haiku-id': 'abcdefghijk'}},
  };
  expect(JSON.stringify(bytecode.timelines.Default), '{"haiku:abcdefghijk":{"opacity":{"0":{"value":0,"curve":"linear"},"150":{"value":1}}}}');
  Bytecode.splitSegment(bytecode, 'abcdefghijk', 'Default', 'svg', 'opacity', 0);
  expect(JSON.stringify(bytecode.timelines.Default), '{"haiku:abcdefghijk":{"opacity":{"0":{"value":0},"150":{"value":1}}}}');
});
