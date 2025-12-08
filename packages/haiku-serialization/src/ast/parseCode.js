import {parse} from '@babel/parser';

function parseCode (code, options) {
  try {
    const parsed = parse(code, options || {
      sourceType: 'module',
    });
    return parsed;
  } catch (exception) {
    return exception;
  }
}

export default parseCode;
