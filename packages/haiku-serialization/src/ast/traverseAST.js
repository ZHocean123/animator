import traverse from '@babel/traverse';

function traverseAST (ast, iterator) {
  traverse(ast, {
    enter (path) {
      iterator(path.node, path.parent);
    },
  });
}

export default traverseAST;
