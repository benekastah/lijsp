
var datum = require('./datum'),
    util = require('./util'),
    path = require('path'),
    assert = require('assert');

function Expander() {
  this.rules = {};
  this.expandExpanded = true;
}
exports.Expander = Expander;

Expander.prototype.EARLY_RULESET_NAME = 'early';
Expander.prototype.DEFAULT_RULESET_NAME = 'default';
Expander.prototype.LATE_RULESET_NAME = 'late';

Expander.prototype.expand = function (ast, compiler) {
  var oldCompiler = this.compiler;
  if (arguments.length > 1) {
    this.compiler = compiler;
  }
  var err;
  try {
    var names = [
        this.EARLY_RULESET_NAME,
        this.DEFAULT_RULESET_NAME,
        this.LATE_RULESET_NAME
      ],
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
  } catch (e) {
    err = e;
  } finally {
    this.compiler = oldCompiler;
    if (err != null) {
      console.error(err.message);
      throw err;
    }
  }
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
    setName = this.DEFAULT_RULESET_NAME;
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
    return datum.map(function (x) {
      if (datum.isList(x)) {
        return _getTemplateVariables(x);
      } else if (exports.isTemplateVariable(x)) {
        return x;
      }
    }, pattern);
  } else if (exports.isTemplateVariable(pattern)) {
    return pattern;
  }
};

exports.getTemplateVariables = function (pattern) {
  var result = _getTemplateVariables(pattern);
  if (!datum.isList(result)) {
    return datum.list(result);
  } else if (result != null) {
    return datum.flatten(result);
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

  var defSyntax = function (pattern, body, rulesetName) {
    var args = datum.cons(
      datum.symbol('' + Math.random()),
      exports.getTemplateVariables(pattern));
    var lambda = datum.concat(
      datum.list(datum.symbol('lambda'), args),
      body);

    var jsc = new datum.JavaScriptCode(
      e.compiler.compileAst(datum.list(
        datum.list(
          new datum.PropertyAccessOperator(),
          datum.symbol('lisp-expander'),
          'addRule'),
        datum.list(
          datum.symbol('quote'),
          pattern),
        lambda,
        rulesetName)));

    var fn;
    try {
      fn = util.getGlobal().lisp_eval(lambda);
      e.addRule(pattern, fn, rulesetName);
    } catch (e) {
      console.warn(e);
    }

    return jsc;
  };

  e.addRule(datum.list(
    datum.symbol('defsyntax'),
    datum.symbol('$pattern'),
    datum.symbol('$$body')), function (ast, pattern, body) {
      return defSyntax(pattern, body);
    });

  e.addRule(datum.list(
    datum.symbol('defsyntax-early'),
    datum.symbol('$pattern'),
    datum.symbol('$$body')), function (ast, pattern, body) {
      return defSyntax(pattern, body, e.EARLY_RULESET_NAME);
    });

  e.addRule(datum.list(
    datum.symbol('defsyntax-late'),
    datum.symbol('$pattern'),
    datum.symbol('$$body')), function (ast, pattern, body) {
      return defSyntax(pattern, body, e.LATE_RULESET_NAME);
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
    datum.symbol('$$b')), function (ast, a, b) {
      if (datum.isList(a)) {
        var lambda = datum.concat(
          datum.list(datum.symbol('lambda'), a.right),
          b);
        return datum.list(datum.symbol('def'), a.left, lambda);
      } else {
        return datum.list(
          new datum.VarOperator(),
          datum.list(
            new datum.JavaScriptCode(a.escapedName()), datum.list(
              new datum.Operator('='),
              datum.list(
                new datum.PropertyAccessOperator(),
                datum.symbol('exports'),
                datum.list(datum.symbol('quote'), a)),
              b.left)));
      }
    });

  e.addRule(datum.list(
    datum.symbol('import'),
    datum.symbol('$fileName')), function (ast, fileName) {
      var opts = e.compiler.opts,
          isGlobal, requireF;

      var appDirName = path.join(opts.appName, '/');
      if (util.startsWith(fileName.name, appDirName)) {
        requireF = path.relative(
          path.dirname(opts.currentFile), fileName.name);
        if (!util.startsWith(requireF, '../')) {
          requireF = './' + requireF;
        }
      } else {
        isGlobal = true;
        requireF = path.join('lijsp/lisp', fileName.name);
      }

      if (opts.fileCompiler) {
        !isGlobal && opts.fileCompiler(fileName.name);
      } else {
        console.warn('No file compiler registered. ' +
                     'You will have to compile each file on your own.');
      }

      return datum.list(
        datum.symbol('def'),
        fileName,
        datum.list(
          datum.symbol('require'),
          requireF + '.lijsp.js'));
    });

  e.addRule(datum.list(
    datum.symbol('import-from'),
    datum.symbol('$module'),
    datum.symbol('$$imports')), function (ast, mod, imports) {
      return datum.list(
        datum.symbol('statements'),
        datum.list(datum.symbol('import'), mod),
        datum.cons(
          datum.symbol('use-from'),
          datum.cons(mod, imports)));
    });

  e.addRule(datum.list(
    datum.symbol('*import-all-globals*')), function () {
      var global = util.getGlobal();
      if (global) {
        var names = datum.apply(datum.list, util.keys(global));
        return datum.cons(
          datum.symbol('import-from'),
          datum.cons(
            datum.symbol('global'),
            names));
      } else {
        console.warn('lijsp not yet properly bootstrapped');
        return null;
      }
    });

  e.addRule(datum.list(
    datum.symbol('use-from'),
    datum.symbol('$obj'),
    datum.symbol('$$imports')), function (ast, obj, imports) {
      var result = datum.map(function (impt) {
        var name1, name2;
        if (impt instanceof datum.Symbol) {
          name1 = name2 = impt;
        } else if (util.type(impt) === '[object String]') {
          name1 = name2 = datum.symbol(impt, true);
        } else if (datum.isList(impt)) {
          var result = exports.compare(
            datum.list(
              datum.symbol('$name1'),
              datum.symbol('as'),
              datum.symbol('$name2')),
            impt);
          name1 = result[1];
          name2 = result[2];
        }
        assert(name1, 'name1 is required');
        assert(name2, 'name2 is required');

        return datum.list(
          datum.symbol('def'),
          name2,
          datum.list(
            new datum.PropertyAccessOperator(),
            obj,
            datum.list(datum.symbol('quote'), name1)));
      }, imports);
      return datum.cons(datum.symbol('statements'), result);
    });

  e.addRule(datum.list(
    datum.symbol('do'), datum.symbol('$$stuff')), function (ast, stuff) {
      return datum.cons(new datum.Operator(','), stuff);
    });

  e.addRule(datum.list(
    datum.symbol('quote'),
    datum.symbol('$expr')), function (ast, expr) {
      if (datum.isList(expr)) {
        expr = datum.map(function (x) {
          return datum.list(datum.symbol('quote'), x);
        }, expr);
      }
      return datum.list(
        new datum.Quote(),
        expr);
    }, e.LATE_RULESET_NAME);

  e.addRule(datum.list(
    datum.symbol('quasiquote'),
    datum.symbol('$expr')), function (ast, expr) {
      var lists = new datum.Collection(),
          listsAddQuoted = function (x) {
            if (x != null) {
              lists.add(datum.list(
                new datum.Quote(),
                x));
            }
          },
          collection;
      if (datum.isList(expr)) {
        collection = new datum.Collection();
        datum.each(function (x) {
          var fst, snd;
          if (datum.isList(x)) {
            fst = datum.first(x);
            snd = datum.second(x);
            if (fst instanceof datum.Symbol) {
              if (fst.name === 'unquote') {
                collection.add(snd);
                return;
              } else if (fst.name === 'unquote-splicing') {
                listsAddQuoted(collection.value);
                lists.add(snd);
                collection = new datum.Collection();
                return;
              }
            }
          }
          collection.add(datum.list(datum.symbol('quasiquote'), x));
        }, expr);

        if (datum.length(lists.value)) {
          listsAddQuoted(collection.value);
          return datum.apply(
            datum.list,
            datum.symbol('concat'),
            lists.value);
        } else {
          expr = collection.value;
        }
      }
      return datum.list(
        new datum.Quote(),
        expr);
    }, e.LATE_RULESET_NAME);

  return e;
};
