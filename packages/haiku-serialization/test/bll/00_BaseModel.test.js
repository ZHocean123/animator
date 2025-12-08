import BaseModel from '../../src/bll/BaseModel.js';

test('BaseModel', () => {
  expect(BaseModel).toBeTruthy();
  class Foo extends BaseModel {}
  BaseModel.extend(Foo);
  expect(Foo).toBeTruthy();
  expect(Foo.on).toBeTruthy();
  expect(Foo.emit).toBeTruthy();
  const foo = new Foo();
  expect(foo).toBeTruthy();
  expect(foo.emit).toBeTruthy();
  expect(foo.on).toBeTruthy();
  class Baz extends BaseModel {}
  BaseModel.extend(Baz);
  const baz1 = Baz.upsert({qux: 1});
  const baz2 = Baz.upsert({qux: 2});
  const baz3 = Baz.upsert({qux: 3});
  expect(Baz.all().length).toBe(3);
  expect(Baz.find({qux: 3})).toBe(baz3);
  expect(Baz.findById(baz1.uid)).toBe(baz1);
  Baz.on('yay', (inst, a, b) => {
    expect(inst).toBe(baz2);
    expect(a).toBe(123);
    expect(b).toBe(456);
  });
  baz2.on('yay', (a, b) => {
    expect(a).toBe(123);
    expect(b).toBe(456);
  });
  baz2.emit('yay', 123, 456);
  class Bar extends BaseModel {}
  BaseModel.extend(Bar, {primaryKey: 'relpath'});
  const bar1 = Bar.upsert({relpath: 'abc'});
  expect(bar1.getPrimaryKey()).toBe('abc');
  const bar1b = Bar.upsert({relpath: 'abc', foo: 101});
  expect(bar1b).toBe(bar1);
  expect(Bar.count()).toBe(1);
  expect(bar1.foo).toBe(101);
  bar1.destroy();
  expect(Bar.count()).toBe(0);
  class Qux extends BaseModel {}
  Qux.DEFAULT_OPTIONS = {foo: 1, required: {blah: true}};
  BaseModel.extend(Qux);
  try {
    const qux1 = new Qux({meow: 2});
  } catch (exception) {
    expect(exception.message).toBe('Property \'blah\' is required');
  }
  const qux2 = new Qux({blah: false});
  expect(qux2.options.foo).toBe(1);
  class Bop extends BaseModel {}
  BaseModel.extend(Bop);
  const bop1 = new Bop();
  const roygbiv1 = bop1.cache.fetch('roy.g.biv', () => 123);
  expect(roygbiv1).toBe(123);
  bop1.cache.clear();
  const roygbiv2 = bop1.cache.fetch('roy.g.biv', () => 456);
  expect(roygbiv2).toBe(456);
  bop1.cache.set('roy.g.biv', 789);
  expect(bop1.cache.get('roy.g.biv')).toBe(789);
});
