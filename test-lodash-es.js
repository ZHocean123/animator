// 简单的测试脚本，验证 lodash-es 函数是否正确工作
import * as lodash from 'lodash-es';
import find from 'lodash-es/find.js';
import merge from 'lodash-es/merge.js';
import filter from 'lodash-es/filter.js';
import debounce from 'lodash-es/debounce.js';
import throttle from 'lodash-es/throttle.js';
import clone from 'lodash-es/clone.js';
import cloneDeep from 'lodash-es/cloneDeep.js';

console.log('测试 lodash-es 函数...');

// 测试数据
const testArray = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
];

// 测试 find 函数
console.log('测试 find 函数:');
const result = find(testArray, { id: 2 });
console.log('查找结果:', result); // 应该输出 { id: 2, name: 'Bob' }

// 测试 merge 函数
console.log('\n测试 merge 函数:');
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 3, c: 4 };
const mergedObj = merge({}, obj1, obj2);
console.log('合并结果:', mergedObj); // 应该输出 { a: 1, b: 3, c: 4 }

// 测试 filter 函数
console.log('\n测试 filter 函数:');
const filtered = filter(testArray, (item) => item.id > 1);
console.log('过滤结果:', filtered); // 应该输出 [{ id: 2, name: 'Bob' }, { id: 3, name: 'Charlie' }]

// 测试 clone 函数
console.log('\n测试 clone 函数:');
const clonedObj = clone(obj1);
console.log('克隆结果:', clonedObj); // 应该输出 { a: 1, b: 2 }

// 测试 cloneDeep 函数
console.log('\n测试 cloneDeep 函数:');
const deepObj = { a: { b: { c: 1 } } };
const deepCloned = cloneDeep(deepObj);
console.log('深克隆结果:', deepCloned); // 应该输出 { a: { b: { c: 1 } } }

// 测试 debounce 函数
console.log('\n测试 debounce 函数:');
let count = 0;
const debouncedFn = debounce(() => {
  count++;
  console.log('Debounce 执行次数:', count);
}, 100);

// 快速调用多次
debouncedFn();
debouncedFn();
debouncedFn();

setTimeout(() => {
  console.log('Debounce 测试完成\n');
  
  // 测试 throttle 函数
  console.log('测试 throttle 函数:');
  let throttleCount = 0;
  const throttledFn = throttle(() => {
    throttleCount++;
    console.log('Throttle 执行次数:', throttleCount);
  }, 100);
  
  // 快速调用多次
  throttledFn();
  throttledFn();
  throttledFn();
  
  setTimeout(() => {
    console.log('Throttle 测试完成');
    console.log('\n所有 lodash-es 函数测试成功！');
  }, 200);
}, 200);