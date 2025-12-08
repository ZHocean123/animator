import generateCode from './generateCode.js';

function getFunctionNodeBody (node) {
  const lines = [];
  for (let i = 0; i < node.body.body.length; i++) {
    lines.push(generateCode(node.body.body[i]));
  }
  const body = lines.join('\n');
  return body;
}

export default getFunctionNodeBody;
