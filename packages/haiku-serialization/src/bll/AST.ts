import expressionToRO from '@haiku/core/lib/reflection/expressionToRO'
import { Experiment, experimentIsEnabled } from 'haiku-common'
import prettier from 'prettier'
import bytecodeObjectToAST from './../ast/bytecodeObjectToAST'
import normalizeBytecodeAST from './../ast/normalizeBytecodeAST'
import parseCode from './../ast/parseCode'
import BaseModel from './BaseModel'

import Bytecode from './Bytecode'
import ModuleWrapper from './ModuleWrapper'
import Template from './Template'

const HAIKU_SOURCE_ATTRIBUTE = 'haiku-source'
const HAIKU_VAR_ATTRIBUTE = 'haiku-var'

class AST extends (BaseModel as any) {
  obj: any

  constructor(props: any, opts: any) {
    super(props, opts)
    this.obj = {}
  }

  updateWithBytecode(bytecode: any, previousSourceCodeString?: string) {
    const imports = (AST as any).findImportsFromTemplate(this.file, bytecode.template)
    const ro = (AST as any).normalizeBytecode(bytecode)
    const { frontMatterNodes, backMatterNodes } = grabExtraMatterFromSourceCode(previousSourceCodeString)
    const ast = bytecodeObjectToAST(ro, imports, frontMatterNodes, backMatterNodes)
    normalizeBytecodeAST(ast as any)
    for (const k1 in this.obj) delete this.obj[k1]
    for (const k2 in ast) this.obj[k2] = (ast as any)[k2]
    return this.obj
  }

  updateWithBytecodeAndReturnCode(bytecode: any, previousSourceCodeString?: string) {
    this.updateWithBytecode(bytecode, previousSourceCodeString)
    return this.toCode()
  }

  toCode() {
    return prettier.format('(()=>{})', { parser: () => this.obj })
  }

  static DEFAULT_OPTIONS = { required: { file: true } }
}

;(BaseModel as any).extend(AST)

function grabExtraMatterFromSourceCode(code?: string) {
  const out = { frontMatterNodes: [] as any[], backMatterNodes: [] as any[] }
  if (!experimentIsEnabled(Experiment.PreserveFrontMatterInCode) || !code)
    return out
  try {
    const ast = parseCode(code)
    if ((ast as any) instanceof Error)
      return out
    if (!(ast as any)?.program?.body)
      return out
    let nodesCollection = out.frontMatterNodes
    ;(ast as any).program.body.forEach((node: any) => {
      if (isAutoGenImportNode(node))
        return
      if (isModuleExportsNode(node)) { nodesCollection = out.backMatterNodes; return }
      nodesCollection.push(node)
    })
    return out
  }
  catch (exception) {
    console.warn('[AST]', exception)
    return out
  }
}

function isAutoGenImportNode(node: any) {
  return (
    node.type === 'VariableDeclaration'
    && node.declarations
    && node.declarations[0]
    && node.declarations[0].type === 'VariableDeclarator'
    && node.declarations[0].init.type === 'CallExpression'
    && node.declarations[0].init.callee.type === 'Identifier'
    && node.declarations[0].init.callee.name === 'require'
    && node.declarations[0].init.arguments
    && doesRequireCalleeArgIndicateAutoGenImport(node.declarations[0].init.arguments[0])
  )
}

function doesRequireCalleeArgIndicateAutoGenImport(node: any) {
  return node && typeof node.value === 'string' && isImportSourceViaAutoGen(node.value)
}

function isImportSourceViaAutoGen(source: string) {
  return (
    source === '@haiku/core'
    || !!source.match(/^@haiku\/core\/components/)
    || !!source.match(/\/code\.js$/)
  )
}

function isModuleExportsNode(node: any) {
  return (
    node.type === 'ExpressionStatement'
    && node.expression.type === 'AssignmentExpression'
    && node.expression.left.type === 'MemberExpression'
    && node.expression.left.object.name === 'module'
    && node.expression.left.property.name === 'exports'
    && node.expression.right.type === 'ObjectExpression'
  )
}

;(AST as any).normalizeBytecode = (bytecode: any) => {
  const safe = (AST as any).safeBytecode(bytecode)
  const decycled = (Bytecode as any).decycle(safe, { doCleanMana: false })
  ;(Bytecode as any).cleanBytecode(decycled)
  ;(Template as any).cleanTemplate(decycled.template)
  return expressionToRO(decycled)
}

;(AST as any).findImportsFromTemplate = (hostfile: any, template: any) => {
  const imports: Record<string, string> = {}
  ;(Template as any).visitWithoutDescendingIntoSubcomponents(template, (node: any) => {
    if (node && node.elementName && typeof node.elementName === 'object') {
      let source: string | undefined
      let identifier: string | undefined
      if (node.elementName.__reference) {
        const reference = (ModuleWrapper as any).parseReference(node.elementName.__reference)
        if (reference) { source = reference.source; identifier = reference.identifier }
      }
      else {
        source = node.attributes && node.attributes[HAIKU_SOURCE_ATTRIBUTE]
        identifier = node.attributes && node.attributes[HAIKU_VAR_ATTRIBUTE]
      }
      if (source && identifier) {
        node.elementName.__reference = (ModuleWrapper as any).buildReference(
          (ModuleWrapper as any).REF_TYPES.COMPONENT,
          (Template as any).normalizePath(`./${hostfile.relpath}`),
          (Template as any).normalizePathOfPossiblyExternalModule(source),
          identifier,
        )
        const importSourcePath = hostfile.getImportPathTo(source)
        imports[importSourcePath] = identifier
      }
    }
  })
  return imports
}

;(AST as any).safeBytecode = (bytecode: any) => {
  const safe: any = {}
  for (const key in bytecode) {
    if (key === 'template') {
      safe[key] = (Template as any).manaWithOnlyStandardProps(bytecode[key], true, (__reference: string) => {
        const ref = (ModuleWrapper as any).parseReference(__reference)
        if (ref && ref.identifier)
          return ref.identifier
        return __reference
      })
    }
    else {
      safe[key] = bytecode[key]
    }
  }
  return safe
}

;(AST as any).parseFile = (_folder: string, _relpath: string, contents: string, cb: (err?: any, ast?: any) => void) => {
  const ast = parseCode(contents)
  if ((ast as any) instanceof Error)
    return cb(ast)
  return cb(null, ast)
}

export default AST
export { AST }
