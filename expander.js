
var datum = require('./datum'),
    util = require('./util');

function Expander() {
  this.rules = {};
}
exports.Expander = Expander;

Expander.prototype.earlyRulesetName = 'early';
Expander.prototype.defaultRulesetName = 'default';
Expander.prototype.lateRulesetName = 'late';

Expander.prototype.expand = function (ast) {
  debugger;
  var names = [this.earlyRulesetName, this.defaultRulesetName,
        this.lateRulesetName],
      expandedAst;
  for (var i = 0, len = names.length; i < len; i++) {
    expandedAst = this.expandRuleset(names[i], ast);
    if (expandedAst !== ast) {
      return expandedAst;
    }
  }
  return ast;
};

Expander.prototype.expandRuleset = function (setName, ast) {
  var ruleset = this.rules[setName],
      rule, expandedAst;
  if (ruleset) {
    for (var i = 0, len = ruleset.length; i < len; i++) {
      rule = ruleset[i];
      if (exports.compare(rule.comparator, ast)) {
        expandedAst = rule.action(ast);
        return this.expand(expandedAst);
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

exports.re_templateVariable = /^\$/;
exports.compare = function (comparator, ast) {
  var isTemplateVariable = comparator instanceof datum.Symbol &&
    exports.re_templateVariable.test(comparator.name);

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

  if (comparator instanceof datum.Cons) {
    if (datum.length(comparator) !== datum.length(ast)) {
      return false;
    }
    var cNode = comparator,
        aNode = ast;
    do {
      var result = exports.compare(cNode.left, aNode.left);
      if (!result) {
        return false;
      }
    } while ((cNode = cNode.right) && (aNode = aNode.right));
  } else if (comparator instanceof datum.Symbol) {
    if (!isTemplateVariable &&
        comparator.name !== ast.name) {
      return false;
    }
  } else if (comparator !== ast) {
    return false;
  }

  return true;
};
