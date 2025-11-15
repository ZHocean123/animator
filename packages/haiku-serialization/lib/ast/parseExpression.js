var Parser = require('cst').Parser;
var walk = require('estree-walker').walk;
var fsm = require('fuzzy-string-matching');
var uniq = require('lodash').uniq;
var FORBIDDEN_EXPRESSION_TOKENS = require('@haiku/core/lib/HaikuComponent').default.FORBIDDEN_EXPRESSION_TOKENS;
var logger = require('./../utils/LoggerInstance');
var PARSER = new Parser({
    sourceType: 'script',
    strictMode: true,
});
// Thresholds for fuzzy string matches when detecting any of these types of tokens
var MATCH_WEIGHTS = {
    INJECTABLES: 0.5,
    KEYWORDS: 0.5,
    DECLARATIONS: 0.5,
};
function wrap(exprWithourWrap) {
    return '(function(){"use strict";\n' + exprWithourWrap + '\n})';
}
function unwrap(exprWithWrap) {
    return exprWithWrap.slice(26, exprWithWrap.length - 3);
}
function getSegsList(list, node) {
    if (node.type === 'Identifier') {
        list.push(node);
        return list;
    }
    if (node.type === 'MemberExpression') {
        getSegsList(list, node.object);
        list.push(node.property);
        return list;
    }
}
function isTokenStreamInvalid(tokens, options) {
    if (tokens.length < 1) {
        return {
            annotation: 'Expression is has no content',
        };
    }
    if (tokens.length === 1 && tokens[0].type === 'Keyword' && tokens[0].value === 'return') {
        return {
            annotation: 'Expression is incomplete',
        };
    }
    if (options.skipForbiddensCheck) {
        return false;
    }
    var foundReturn = false;
    var foundForbiddenToken = false;
    var otherWarning = false;
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var parent_1 = tokens[i - 1];
        var grandparent = tokens[i - 2];
        if (token.type === 'Keyword') {
            if (token.value === 'return') {
                foundReturn = true;
            }
        }
        if (token.type === 'Identifier' || token.type === 'Keyword') {
            if (token.value === 'random') {
                if (parent_1 && parent_1.value === '.') {
                    if (grandparent && grandparent.value === 'Math') {
                        otherWarning = 'Instead of Math.random(), use $helpers.rand()';
                        break;
                    }
                }
            }
            if (token.value === 'now') {
                if (parent_1 && parent_1.value === '.') {
                    if (grandparent && grandparent.value === 'Date') {
                        otherWarning = 'Instead of Date.now(), use $helpers.now()';
                        break;
                    }
                }
            }
            if (FORBIDDEN_EXPRESSION_TOKENS[token.value]) {
                foundForbiddenToken = token;
                break;
            }
        }
    }
    if (otherWarning) {
        return {
            annotation: otherWarning,
        };
    }
    if (foundForbiddenToken) {
        return {
            annotation: foundForbiddenToken.type + ' "' + foundForbiddenToken.value + '" is not allowed in expressions',
        };
    }
    if (!foundReturn) {
        return {
            annotation: 'Expression must have a return statement',
        };
    }
    return false;
}
function smushKeys(out, base, obj, depth, minDepth, maxDepth) {
    for (var key in obj) {
        var sub = (base) ? (base + '.' + key) : key;
        if (depth >= minDepth && depth <= maxDepth) {
            out.push(sub);
        }
        smushKeys(out, sub, obj[key], depth + 1, minDepth, maxDepth);
    }
    return out;
}
function populateCompletions(target, injectables, keywords, declarations) {
    var segs = getSegsList([], target);
    // Nothing to do if we have no segments
    if (segs.length < 1) {
        return [];
    }
    var completions = new Set();
    var chain = segs.map(function (identifierNode) { return identifierNode.name; }).join('.');
    // Only try to match declarations and keywords if we are only dealing with one segment
    if (segs.length === 1) {
        for (var declarationKey in declarations) {
            if (fsm(segs[0].name, declarationKey) > MATCH_WEIGHTS.DECLARATIONS) {
                completions.add(declarationKey);
            }
        }
        for (var keywordKey in keywords) {
            if (!FORBIDDEN_EXPRESSION_TOKENS[keywordKey]) {
                if (fsm(segs[0].name, keywordKey) > MATCH_WEIGHTS.KEYWORDS) {
                    completions.add(keywordKey);
                }
            }
        }
    }
    var found = {};
    findMatches(found, segs, 0, injectables);
    smushKeys([], null, found, 0, segs.length - 1, segs.length).forEach(function (smushed) {
        completions.add(smushed);
    });
    // If there is exactly one completion, and it's identical to our chain, we should not show completions.
    if (completions.size === 1 && completions.has(chain)) {
        return [];
    }
    var nChain = chain.toLowerCase();
    // We impose a strict weak ordering, as follows:
    //  - exact matches are at the front
    //  - case-insensitive typeahead matches come next
    //  - the remainder is sorted lexographically
    return Array.from(completions).sort(function (a, b) {
        var na = a.toLowerCase();
        var nb = b.toLowerCase();
        // Ensures exact matches are always at the top.
        if (a === chain) {
            return -1;
        }
        if (b === chain) {
            return 1;
        }
        // Ensures typeahead matches come next after exact matches.
        if (na.startsWith(nChain)) {
            return -1;
        }
        if (nb.startsWith(nChain)) {
            return 1;
        }
        // The rest can be sorted lexographically.
        if (na < nb) {
            return -1;
        }
        if (na > nb) {
            return 1;
        }
        return 0;
    }).map(dataizeCompletion);
    // // Strip out any completions that are 'below' the current completion,
    // // but preserve those that are 'above' so we can reveal new possibilities
    // for (var completionString in completions) {
    //   if (completionString.split('.').length < segs.length) {
    //     delete completions[completionString]
    //   }
    // }
    // // If there's only one key here and we have a match, then there's nothing to complete
    // if (Object.keys(completions).length < 2 && completions[chain]) {
    //   return {}
    // }
    return completions;
}
function findMatches(found, segs, idx, base) {
    if (Array.isArray(base)) {
        return found;
    }
    if (!base || typeof base !== 'object') {
        return found;
    }
    var name = segs[idx] && segs[idx].name;
    var prev = segs[idx - 1] && segs[idx - 1].name;
    if (!name && !prev) {
        return found;
    }
    // The user has probably typed a _full_ completion, but we need to check for sub-objects to recommend those
    if (!name && prev) {
        for (var k4 in base) {
            if (!found[k4]) {
                found[k4] = {};
            }
        }
        return found;
    }
    if (!name) {
        return found;
    }
    // Special case: Just display all injectable roots
    if (name === '$') {
        for (var k1 in base) {
            if (k1[0] === '$') {
                if (!found[k1]) {
                    found[k1] = {};
                }
            }
        }
        return found;
    }
    // Special case: If under three characters, search on those chars
    if (name.length < 5) {
        var lcname = name.toLowerCase();
        for (var k2 in base) {
            if (k2.slice(0, lcname.length).toLowerCase() === lcname) {
                if (!found[k2]) {
                    found[k2] = {};
                }
                findMatches(found[k2], segs, idx + 1, base[k2]);
            }
        }
        return found;
    }
    for (var k3 in base) {
        if (fsm(name, k3) < MATCH_WEIGHTS.INJECTABLES) {
            continue;
        }
        if (!found[k3]) {
            found[k3] = {};
        }
        findMatches(found[k3], segs, idx + 1, base[k3]);
    }
    return found;
}
function dataizeCompletion(completion) {
    return { name: completion };
}
function chooseTarget(candidate, existing) {
    if (!existing) {
        return candidate;
    }
    if (existing.type === 'Identifier' && candidate.type === 'MemberExpression') {
        return candidate;
    }
    if (existing.type === 'MemberExpression' && candidate.type === 'Identifier') {
        return existing;
    }
    return candidate;
}
/**
 * @function parseExpression
 * @description Given an expression string, parse it and return a summary about it, including
 * tokens, params, as well as any warnings/errors that need to be displayed to the coder.
 */
function parseExpression(expr, injectables, keywords, state, cursor, options) {
    if (!options) {
        options = {};
    }
    try {
        // At any point in the process here we may want to populate a warning based on what happens
        var warnings = [];
        var cst = PARSER._parseAst(expr);
        var tokens = PARSER._processTokens(cst, expr);
        tokens = tokens.slice(8); // Slice off the "(function(){"use strict";\n" tokens
        tokens.splice(tokens.length - 4); // Slice off the "})\n\eof" tokens
        var candidates_1 = []; // Going to find possible targets and select the best fit
        // 1. Get a list of all variables that were declared inside the scope of this expression
        // TODO: What other besides var, let, const, and const { a } = {...} is there?
        var declarations_1 = {};
        // 2. Create a list of identifiers that look like references to external things, i.e., anything
        // not defined inside our scope, possibly a keyword or an 'injectable' the user wants to summon.
        var references_1 = [];
        walk(cst, {
            enter: function enter(node) {
                if (cursor) { // If no cursor, nothing to do
                    if (!node.sourceCode && node.loc) { // If no node location, nothing to do; also skip 'Tokens' which have .sourceCode
                        if (node.loc.start.line === node.loc.end.line) { // Only identifiers on the same line (not braces)
                            if (node.loc.start.line === cursor.line) { // Only on the same line as the cursor
                                if (node.loc.start.column <= cursor.ch && node.loc.end.column >= cursor.ch) {
                                    if (node.type === 'MemberExpression' || node.type === 'Identifier') {
                                        candidates_1.push(node);
                                    }
                                }
                            }
                        }
                    }
                }
                if (node.type === 'VariableDeclaration') {
                    for (var i = 0; i < node.declarations.length; i++) {
                        var declarator = node.declarations[i];
                        if (declarator.id.type === 'Identifier') {
                            declarations_1[declarator.id.name] = true;
                        }
                        else if (declarator.id.type === 'ObjectPattern') {
                            for (var j = 0; j < declarator.id.properties.length; j++) {
                                declarations_1[declarator.id.properties[j].key.name] = true;
                            }
                        }
                    }
                }
                // We check for node.name since estree-walker provides duplicates from the token stream
                // as well as the tree, and we use only the tree nodes
                if (node.type === 'Identifier' && node.name) {
                    references_1.push(node);
                }
            },
        });
        // The node representing the current placement of the cursor, if any
        var target = null;
        // Loop through the candidates and find the one that is the best fit for a target
        for (var i = 0; i < candidates_1.length; i++) {
            target = chooseTarget(candidates_1[i], target);
        }
        // Now strip away any references that refer to any declarations that were made in scope
        for (var j = references_1.length - 1; j > -1; j--) {
            var reference = references_1[j];
            if (declarations_1[reference.name]) {
                references_1.splice(j, 1);
            }
        }
        var params_1 = [];
        if (references_1.length > 0) {
            references_1.forEach(function (reference) {
                // If this seg was the first element, and if it matches a forbidden
                // token, then don't include this in the list of injectables
                if (FORBIDDEN_EXPRESSION_TOKENS[reference.name]) {
                    return null;
                }
                // Don't include any reference in the final params if it doesn't match
                // a known injectable that core can provide
                if (!injectables[reference.name]) {
                    return null;
                }
                params_1.push(reference.name);
            });
        }
        params_1 = uniq(params_1);
        // Completions is initially populated as a dict so we avoid having double entries in the list
        var completions = void 0;
        // If we got a target node that is an identifier, we can display autocompletions for it, if any match
        if (target && (target.type === 'Identifier' || target.type === 'MemberExpression')) {
            completions = populateCompletions(target, injectables, keywords, declarations_1);
        }
        else {
            completions = [];
        }
        var tokenInvalidity = isTokenStreamInvalid(tokens, options);
        if (tokenInvalidity) {
            warnings.push(tokenInvalidity);
        }
        return {
            cst: cst,
            tokens: tokens,
            declarations: declarations_1,
            references: references_1,
            params: params_1,
            warnings: warnings,
            completions: completions,
            target: target,
            source: expr,
        };
    }
    catch (error) {
        logger.warn('[parse expression]', error.message);
        return {
            error: error,
        };
    }
}
// Must expose for Timeline <ExpressionInput> component
parseExpression.wrap = wrap;
parseExpression.unwrap = unwrap;
module.exports = parseExpression;
//# sourceMappingURL=parseExpression.js.map