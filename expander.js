
var datum = require('./datum'),
    util = require('./util'),
    assert = require('assert');

function Expander() {
  this.rules = {};
  this.expandExpanded = true;
}
exports.Expander = Expander;

Expander.prototype.earlyRulesetName = 'early';
Expander.prototype.defaultRulesetName = 'default';
Expander.prototype.lateRulesetName = 'late';

Expander.prototype.expand = function (ast) {
  var names = [this.earlyRulesetName, this.defaultRulesetName,
        this.lateRulesetName],
      expandedAst = ast;
  for (var i = 0, len = names.length; i < len; i++) {
    expandedAst = this.expandRuleset(names[i], ast);
    if (expandedAst !== ast) {
      break;
    }
  }
  if (datum.isList(expandedAst)) {
    // After the original form has been expanded, expand each of its
    // children.
    expandedAst = datum.map(util.bind(function (x) {
      return this.expand(x);
    }, this), expandedAst);
  }
  return expandedAst;
};

Expander.prototype.expandRuleset = function (setName, ast) {
  var ruleset = this.rules[setName],
      rule, expandedAst, match;
  if (ruleset) {
    for (var i = 0, len = ruleset.length; i < len; i++) {
      rule = ruleset[i];
      if ((match = exports.compare(rule.comparator, ast))) {
        expandedAst = rule.action.apply(rule, match);
        return this.expandExpanded ? this.expand(expandedAst) : expandedAst;
      }
    }
  }
  return ast;
};

Expander.prototype.addRule = function (comparator, action, setName) {
  if (setName == null) {
    setName = this.defaultRulesetName;
  }
  var set = this.rules[setName] || (this.rules[setName] = []);
  set.push({
    comparator: comparator,
    action: action
  });
  return this;
};

exports.toTemplateVariable = function (sym) {
  var result;
  if (sym instanceof datum.Symbol) {
    if (exports.re_templateRestVariable.test(sym.name)) {
      result = new datum.TemplateRestVariable(sym);
    } else if (exports.re_templateVariable.test(sym.name)) {
      result = new datum.TemplateVariable(sym);
    } else if (exports.re_escapedTemplateVariable.test(sym.name)) {
      result = new datum.Symbol(sym.name.substr(1));
    }
  }
  return result || sym;
};

exports.isTemplateVariable = function (x) {
  return exports.toTemplateVariable(x) instanceof datum.TemplateVariable;
};

var _getTemplateVariables = function (pattern) {
  if (datum.isList(pattern)) {
    return datum.filter(exports.isTemplateVariable, pattern);
  } else if (exports.isTemplateVariable(pattern)) {
    return pattern;
  }
};

exports.getTemplateVariables = function (pattern) {
  var result = _getTemplateVariables(pattern);
  if (!datum.isList(result)) {
    return datum.list(result);
  } else if (result) {
    return result;
  } else {
    return datum.list();
  }
};

exports.re_templateVariable = /^\$/;
exports.re_templateRestVariable = /^\$\$/;
exports.re_escapedTemplateVariable = /^\\\$/;
exports.compare = function (comparator, ast, match) {
  if (!match) {
    match = [ast];
  }

  if (util.type(comparator) === '[object Function]') {
    return comparator(ast);
  }

  comparator = exports.toTemplateVariable(comparator);
  var isTemplateVariable = comparator instanceof datum.TemplateVariable;
  if (!isTemplateVariable) {
    // Ensure each is the same type
    if (util.type(comparator) !== util.type(ast)) {
      return false;
    } else if (comparator != null && ast != null) {
      if (comparator.constructor !== ast.constructor) {
        return false;
      }
    }
  }

  if (datum.isList(comparator) && datum.isList(ast)) {
    var cNode = comparator,
        aNode = ast,
        result;

    while (cNode || aNode) {
      if (!cNode) {
        return false;
      }
      cNode.left = exports.toTemplateVariable(cNode.left);
      if (cNode.left instanceof datum.TemplateRestVariable) {
        match.push(aNode);
        if (cNode.right) {
          throw new Error('Can\'t have a rest arg that is not the last argument');
        }
        return match;
      } else {
        if (!aNode) {
          return false;
        }
        result = exports.compare(cNode.left, aNode.left, match);
        if (!result) {
          return false;
        }
      }

      cNode = cNode && cNode.right;
      aNode = aNode && aNode.right;
    }
  } else if (comparator instanceof datum.Symbol ||
             comparator instanceof datum.Operator) {
    if (comparator.name !== ast.name) {
      return false;
    }
  } else if (isTemplateVariable) {
    match.push(ast);
  } else if (comparator !== ast) {
    return false;
  }

  return match;
};

exports.type = function (t) {
  var tType = util.type(t);
  if (tType === '[object String]') {
    return function (ast) {
      if (typeof ast  === t || util.type(ast) === t) {
        return [ast];
      }
      return false;
    };
  } else if (tType === '[object Function]') {
    return function (ast) {
      if (ast instanceof t) {
        return [ast];
      }
      return false;
    };
  } else {
    throw 'Invalid type expression "' + t + '"';
  }
};

exports.test = function (f) {
  assert.ok(util.type(f) === '[object Function]');
  return function (ast) {
    if (f(ast)) {
      return [ast];
    }
    return false;
  };
};

exports.makeExpander = function () {
  var e = new Expander();

  e.addRule(datum.list(
    datum.symbol('defsyntax'),
    datum.symbol('$pattern'),
    datum.symbol('$$body')), function (ast, pattern, body) {
      var args = exports.getTemplateVariables(pattern);
      var lambda = datum.list(datum.symbol('lambda'), args, body);
      var fn = eval('(' + e.compiler.compileAst(lambda) + ')');
      e.addRule(pattern, fn);
      return null;
    });

  e.addRule(datum.list(
    datum.symbol('lambda'),
    datum.symbol('$args'),
    datum.symbol('$$body')), function (ast, args, body) {
      var ret = datum.last(body);
      body = datum.concat(
        datum.init(body),
        datum.list(
          datum.list(new datum.ReturnOperator(), ret)));
      return datum.list(new datum.FunctionOperator(), args, body);
    });

  e.addRule(datum.list(
    datum.symbol('def'),
    datum.symbol('$a'),
    datum.symbol('$b')), function (ast, a, b) {
      if (datum.isList(a)) {
        var lambda = datum.list(datum.symbol('lambda'), a.right, b);
        return datum.list(datum.symbol('def'), a.left, lambda);
      } else {
        return datum.list(new datum.VarOperator(), new datum.list(a, b));
      }
    });

  e.addRule(datum.list(
    datum.symbol('quote'),
    datum.symbol('$expr')), function (ast, expr) {
      if (datum.isList(expr)) {
        return datum.apply(datum.list, datum.symbol('list'), expr);
      } else if (expr instanceof datum.Symbol) {
        return datum.list(
          new datum.Operator('new'),
          datum.list(
            datum.symbol('Symbol'),
            expr.name));
      }
      return expr;
    });

  return e;
};
