import FORBIDDEN_EXPRESSION_TOKENS from '@haiku/core/lib/HaikuComponent'
import { Parser } from 'cst'
import walk from 'estree-walker'
import fsm from 'fuzzy-string-matching'
import uniq from 'lodash/uniq'

import logger from './../utils/LoggerInstance'

const PARSER = new Parser({ sourceType: 'script', strictMode: true })

const MATCH_WEIGHTS = { INJECTABLES: 0.5, KEYWORDS: 0.5, DECLARATIONS: 0.5 }

function wrap(exprWithourWrap: string) { return `(function(){"use strict";\n${exprWithourWrap}\n})` }
function unwrap(exprWithWrap: string) { return exprWithWrap.slice(26, exprWithWrap.length - 3) }

function getSegsList(list: any[], node: any) {
  if (node.type === 'Identifier') { list.push(node); return list }
  if (node.type === 'MemberExpression') { getSegsList(list, node.object); list.push(node.property); return list }
}

function isTokenStreamInvalid(tokens: any[], options: any) {
  if (tokens.length < 1)
    return { annotation: 'Expression is has no content' }
  if (tokens.length === 1 && tokens[0].type === 'Keyword' && tokens[0].value === 'return')
    return { annotation: 'Expression is incomplete' }
  if (options.skipForbiddensCheck)
    return false
  let foundReturn = false; let foundForbiddenToken: any = false; let otherWarning: any = false
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]; const parent = tokens[i - 1]; const grandparent = tokens[i - 2]
    if (token.type === 'Keyword' && token.value === 'return')
      foundReturn = true
    if (token.type === 'Identifier' || token.type === 'Keyword') {
      if (token.value === 'random') { if (parent && parent.value === '.') { if (grandparent && grandparent.value === 'Math') { otherWarning = 'Instead of Math.random(), use $helpers.rand()'; break } } }
      if (token.value === 'now') { if (parent && parent.value === '.') { if (grandparent && grandparent.value === 'Date') { otherWarning = 'Instead of Date.now(), use $helpers.now()'; break } } }
      if (FORBIDDEN_EXPRESSION_TOKENS[token.value]) { foundForbiddenToken = token; break }
    }
  }
  if (otherWarning)
    return { annotation: otherWarning }
  if (foundForbiddenToken)
    return { annotation: `${foundForbiddenToken.type} "${foundForbiddenToken.value}" is not allowed in expressions` }
  if (!foundReturn)
    return { annotation: 'Expression must have a return statement' }
  return false
}

function smushKeys(out: any[], base: string | null, obj: any, depth: number, minDepth: number, maxDepth: number) {
  for (const key in obj) {
    const sub = (base) ? (`${base}.${key}`) : key
    if (depth >= minDepth && depth <= maxDepth)
      out.push(sub)
    smushKeys(out, sub, obj[key], depth + 1, minDepth, maxDepth)
  }
  return out
}

function populateCompletions(target: any, injectables: Record<string, any>, keywords: Record<string, any>, declarations: Record<string, any>) {
  const segs = getSegsList([], target)
  if (segs.length < 1)
    return []
  const completions = new Set<string>()
  const chain = segs.map((identifierNode: any) => identifierNode.name).join('.')
  if (segs.length === 1) {
    for (const declarationKey in declarations) {
      if (fsm(segs[0].name, declarationKey) > MATCH_WEIGHTS.DECLARATIONS)
        completions.add(declarationKey)
    }
    for (const keywordKey in keywords) {
      if (!FORBIDDEN_EXPRESSION_TOKENS[keywordKey]) {
        if (fsm(segs[0].name, keywordKey) > MATCH_WEIGHTS.KEYWORDS)
          completions.add(keywordKey)
      }
    }
  }
  const found: Record<string, any> = {}
  findMatches(found, segs, 0, injectables)
  smushKeys([], null, found, 0, segs.length - 1, segs.length).forEach((smushed: string) => completions.add(smushed))
  if (completions.size === 1 && completions.has(chain))
    return []
  const nChain = chain.toLowerCase()
  return Array.from(completions).sort((a, b) => {
    const na = a.toLowerCase(); const nb = b.toLowerCase(); if (a === chain)
      return -1; if (b === chain)
      return 1; if (na.startsWith(nChain))
      return -1; if (nb.startsWith(nChain))
      return 1; if (na < nb)
      return -1; if (na > nb)
      return 1; return 0
  }).map(dataizeCompletion)
}

function findMatches(found: any, segs: any[], idx: number, base: any) {
  if (Array.isArray(base))
    return found
  if (!base || typeof base !== 'object')
    return found
  const name = segs[idx] && segs[idx].name
  const prev = segs[idx - 1] && segs[idx - 1].name
  if (!name && !prev)
    return found
  if (!name && prev) {
    for (const k4 in base) {
      if (!found[k4])
        found[k4] = {}
    } return found
  }
  if (!name)
    return found
  if (name === '$') {
    for (const k1 in base) {
      if (k1[0] === '$') {
        if (!found[k1])
          found[k1] = {}
      }
    } return found
  }
  if (name.length < 5) {
    const lcname = name.toLowerCase(); for (const k2 in base) {
      if (k2.slice(0, lcname.length).toLowerCase() === lcname) {
        if (!found[k2])
          found[k2] = {}; findMatches(found[k2], segs, idx + 1, base[k2])
      }
    } return found
  }
  for (const k3 in base) {
    if (fsm(name, k3) < MATCH_WEIGHTS.INJECTABLES)
      continue; if (!found[k3])
      found[k3] = {}; findMatches(found[k3], segs, idx + 1, base[k3])
  }
  return found
}

function dataizeCompletion(completion: string) { return { name: completion } }
function chooseTarget(candidate: any, existing: any) {
  if (!existing)
    return candidate; if (existing.type === 'Identifier' && candidate.type === 'MemberExpression')
    return candidate; if (existing.type === 'MemberExpression' && candidate.type === 'Identifier')
    return existing; return candidate
}

function parseExpression(expr: string, injectables: any, keywords: any, state: any, cursor: any, options?: any) {
  if (!options)
    options = {}
  try {
    const warnings: any[] = []
    const cst = PARSER._parseAst(expr)
    let tokens = PARSER._processTokens(cst, expr)
    tokens = tokens.slice(8)
    tokens.splice(tokens.length - 4)
    const candidates: any[] = []
    const declarations: Record<string, boolean> = {}
    const references: any[] = []
    walk(cst, { enter: function enter(node: any) {
      if (cursor) { if (!node.sourceCode && node.loc) { if (node.loc.start.line === node.loc.end.line) { if (node.loc.start.line === cursor.line) { if (node.loc.start.column <= cursor.ch && node.loc.end.column >= cursor.ch) { if (node.type === 'MemberExpression' || node.type === 'Identifier') { candidates.push(node) } } } } } } if (node.type === 'VariableDeclaration') {
        for (let i = 0; i < node.declarations.length; i++) {
          const declarator = node.declarations[i]; if (declarator.id.type === 'Identifier') {
            declarations[declarator.id.name] = true
          }
          else if (declarator.id.type === 'ObjectPattern') { for (let j = 0; j < declarator.id.properties.length; j++) { declarations[declarator.id.properties[j].key.name] = true } }
        }
      } if (node.type === 'Identifier' && node.name)
        references.push(node)
    } })
    let target: any = null
    for (let i = 0; i < candidates.length; i++) target = chooseTarget(candidates[i], target)
    for (let j = references.length - 1; j > -1; j--) {
      const reference = references[j]; if (declarations[reference.name])
        references.splice(j, 1)
    }
    let params: string[] = []
    if (references.length > 0) {
      references.forEach((reference: any) => {
        if (FORBIDDEN_EXPRESSION_TOKENS[reference.name])
          return null; if (!injectables[reference.name])
          return null; params.push(reference.name)
      })
    }
    params = uniq(params)
    let completions: any[]
    if (target && (target.type === 'Identifier' || target.type === 'MemberExpression'))
      completions = populateCompletions(target, injectables, keywords, declarations)
    else completions = []
    const tokenInvalidity = isTokenStreamInvalid(tokens, options)
    if (tokenInvalidity)
      warnings.push(tokenInvalidity)
    return { cst, tokens, declarations, references, params, warnings, completions, target, source: expr }
  }
  catch (error: any) { (logger as any).warn('[parse expression]', error.message); return { error } }
}

;(parseExpression as any).wrap = wrap
;(parseExpression as any).unwrap = unwrap

export default parseExpression
export { parseExpression }
