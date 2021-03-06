
var util = require('./util'),
    Iterable = require('./iterable/iterable');

var datum = exports;

function JavaScriptCode(code) {
  this.code = code;
}
exports.JavaScriptCode = JavaScriptCode;
JavaScriptCode.prototype.inspect = function () {
  return '@{' + util.color(this.code, 'magenta') + '}';
};

function Symbol(name) {
  this.name = name instanceof Symbol ? name.name : name;
  if (this.name == null) {
    throw new Error('Invalid name: ' + name);
  }
}
exports.Symbol = Symbol;

Symbol.prototype.re_unsafe = /^\d|[^\w\$]/g;

Symbol.prototype.wrapper = {start: '_$', end: '$_'};
Symbol.prototype.wrap = function (s) {
  return this.wrapper.start + s + this.wrapper.end;
};

Symbol.prototype.escapedName = function () {
  if (util.contains(this.reservedWords, this.name)) {
    return this.wrap(this.name);
  } else {
    return this.name.replace(this.re_unsafe, util.bind(
      function (match) {
        return this.wrap(match.charCodeAt(0).toString(32));
      }, this));
  }
};

Symbol.prototype.toString = Symbol.prototype.escapedName;

Symbol.prototype.inspect = function () {
  return util.color(this.name, 'green');
};

Symbol.prototype.reservedWords = [
  'break',
  'case',
  'catch',
  'class',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield'
];


exports.symbol = function (name) {
  return new Symbol(name);
};

exports.gensym = function (sym) {
  if (sym instanceof Symbol) {
    sym = sym.name;
  }
  if (!sym) {
    sym = '';
  } else {
    sym += '-';
  }
  return datum.symbol(sym + Math.random());
};


function Operator(name) {
  this.name = name;
}
exports.Operator = Operator;
Operator.prototype.inspect = function () {
  return util.color('@<' + this.name + '>', 'magenta');
};

var inspectableOperator = function (Class, name) {
  Class.prototype.inspect = util.bind(
    Operator.prototype.inspect, {name: name});
};

exports.specialOperators = [];
var makeSpecialOperator = function (f) {
  exports.specialOperators.push(f);
  exports[f.name] = f;
};

function TernaryOperator() {}
inspectableOperator(TernaryOperator, '?:');
makeSpecialOperator(TernaryOperator);


function VoidOperator() {}
inspectableOperator(VoidOperator, 'void');
makeSpecialOperator(VoidOperator);


function ThisOperator() {}
inspectableOperator(ThisOperator, 'this');
makeSpecialOperator(ThisOperator);


function VarOperator() {}
inspectableOperator(VarOperator, 'var');
makeSpecialOperator(VarOperator);


function FunctionOperator() {}
inspectableOperator(FunctionOperator, 'function');
makeSpecialOperator(FunctionOperator);


function ReturnOperator() {}
inspectableOperator(ReturnOperator, 'return');
makeSpecialOperator(ReturnOperator);


function PropertyAccessOperator() {}
inspectableOperator(PropertyAccessOperator, '.');
makeSpecialOperator(PropertyAccessOperator);

function ForOperator() {}
inspectableOperator(ForOperator, 'for');
makeSpecialOperator(ForOperator);

function TryOperator() {}
inspectableOperator(TryOperator, 'try');
makeSpecialOperator(TryOperator);

function CatchOperator() {}
inspectableOperator(CatchOperator, 'catch');
makeSpecialOperator(CatchOperator);

function Quote() {}
util.inspectable(Quote);
makeSpecialOperator(Quote);


function TemplateVariable(symbol, value) {
  this.symbol = new Symbol(symbol);
  this.value = value;
}
exports.TemplateVariable = TemplateVariable;

exports.templateVariable = function (symbol, value) {
  return new TemplateVariable(symbol, value);
};


function TemplateRestVariable(symbol, value) {
  TemplateVariable.call(this, symbol, value);
}
exports.TemplateRestVariable = TemplateRestVariable;
util.inherits(TemplateRestVariable, TemplateVariable);

exports.templateRestVariable = function (symbol) {
  return new TemplateRestVariable(symbol);
};

exports.identity = function (x) {
  return x;
};

function Cons(left, right) {
  this.left = left;
  this.right = right;
}
exports.Cons = Cons;

var consInspect = function (p) {
  return [
    '(', util.lispInspect(p.left),
    util.color(' · ', 'magenta'),
    util.lispInspect(p.right), ')'
  ].join('');
};

var listInspect = function (ls) {
  var result = [];
  exports.each(function (x) {
    if (exports.isList(x)) {
      result.push(listInspect(x));
    } else {
      result.push(util.lispInspect(x));
    }
  }, ls);
  result = result.join(' ');
  return '(' + result + ')';
};

Cons.prototype.inspect = function () {
  if (exports.isList(this)) {
    return listInspect(this);
  } else {
    return consInspect(this);
  }
};

exports.cons = function (left, right) {
  return new Cons(left, right);
};

exports.list = function () {
  var result, argslen = arguments.length;
  for (var i = argslen - 1; i >= 0; i--) {
    result = new Cons(arguments[i], result);
    result.__isList__ = true;
    result.length = argslen - i;
  }
  return result;
};

exports.apply = function (fn) {
  var freeArgs = util.slice(arguments, 1, -1);
  var ls = exports.last(arguments);
  var args = exports.concat(freeArgs, ls);
  return fn.apply(this, args);
};

/**
 * This adds an __isList__ property to all Cons cells that may be lists.
 * This is because it is expected that Cons cells won't be modified in a
 * program (though this is not strictly enforced). The result is that
 * this function is effectively memoized (actual lists perform the worst in
 * this function, and the result will only have to be calculated once per
 * identical list).
 */
exports.isList = function (input) {
  if (input == null) {
    return true;
  }
  if (input instanceof Cons && '__isList__' in input) {
    return input.__isList__;
  }
  var ls = input;
  var result = !!ls;
  while (result && ls) {
    result = ls instanceof Cons;
    ls = ls.right;
  }

  if (input instanceof Cons) {
    input.__isList__ = result;
  }
  return result;
};

exports.isPair = function (p) {
  return p instanceof Cons && !exports.isList(p);
};

/**
 * The length property is added to lists because it is expected they will
 * not change in a program, though this is not strictly enforced. This
 * causes future calls on the same list to be much faster than the first.
 */
exports.length = function (ls) {
  var result = 0, iter, next;

  if (ls && typeof ls.length === 'number') {
    return ls.length;
  }

  if (datum.isList(ls)) {
    if (!ls) {
      result = 0;
    } else {
      result = 1 + exports.length(ls.right);
      ls.length = result;
    }
  } else {
    iter = new Iterable(ls);
    while (!(next = iter.next()).done) {
      result += 1;
    }
  }
  return result;
};

exports.head = function (ls) {
  return ls instanceof Cons ?
    ls.left :
    ls ?
      ls[0] :
      null;
};

exports.first = exports.head;

exports.second = function (ls) {
  if (!exports.isList(ls) && ls instanceof Cons) {
    return ls.right;
  } else {
    return exports.nth(1, ls);
  }
};

exports.last = function (ls) {
  if (exports.isList(ls)) {
    while (ls) {
      if (!ls.right) {
        return ls.left;
      }
      ls = ls.right;
    }
  } else if (ls instanceof Cons) {
    return ls.right;
  } else if (ls) {
    return ls[ls.length - 1];
  }
  return null;
};

exports.tail = function (ls) {
  return ls instanceof Cons ?
    ls.right :
    ls ?
      util.slice(ls, 1) :
      null;
};

exports.init = function (ls) {
  if (ls === null) {
    return null;
  }
  var result, currentResult;
  if (exports.isList(ls) && ls.right) {
    result = currentResult = new Cons();
    while (currentResult) {
      currentResult.left = ls.left;
      currentResult = currentResult.right =
        ls.right && ls.right.right ? new Cons() : null;
      ls = ls.right;
    }
  } else if (ls) {
    result = util.slice(ls, 0, ls.length - 1);
  }
  return result;
};

var _join = Array.prototype.join;
exports.join = function (ls, sep) {
  if (sep == null) {
    sep = '';
  }
  var result = '';
  if (exports.isList(ls)) {
    while (ls) {
      result += ls.left + (ls.right ? sep : '');
      ls = ls.right;
    }
  } else if (ls) {
    if (ls.join) {
      result = ls.join(sep);
    } else {
      result = _join.call(ls, sep);
    }
  }
  return result;
};

exports.each = function (fn, opts, ls) {
  if (arguments.length < 3) {
    ls = opts;
    opts = null;
  }
  opts || (opts = {});
  var iter = new Iterable(ls, opts),
      next, result;
  while (!(next = iter.next()).done) {
    if (opts.keys) {
      result = fn.apply(null, util.asArray(next.value));
    } else {
      result = fn(next.value);
    }
    if (result === false) {
      return;
    }
  }
};

function Collection(coll) {
  var t;
  this.value = coll;
  if (exports.isList(coll)) {
    this.curValue = this.value;
    this.add = this._addToList;
  } else if (util.typeIsArrayLike(t = util.type(coll))) {
    if (t === '[object Arguments]') {
      this.value = util.slice(this.value);
    }
    this.add = this._addToArray;
  } else if (t === '[object Object]') {
    this.add = this._addToObject;
  } else if (t === '[object String]') {
    this.add = this._addToString;
  } else {
    throw 'unimplemented';
  }
}
exports.Collection = Collection;

Collection.prototype._addToList = function (x) {
  var c = new Cons();
  c.left = x;
  if (this.value) {
    this.curValue = this.curValue.right = c;
  } else {
    this.value = this.curValue = c;
  }
};

Collection.prototype._addToArray = function (a, b) {
  if (arguments.length < 2) {
    this.value.push(a);
  } else {
    this.value[a] = b;
  }
};

Collection.prototype._addToObject = function (k, v) {
  this.value[k] = v;
};

Collection.prototype._addToString = function (s) {
  this.value += s;
};

Collection.mimicType = function (c) {
  var arg, t;
  if (exports.isList(c)) {
    arg = null;
  } else if (util.typeIsArrayLike(t = util.type(c))) {
    arg = [];
  } else if (t === '[object Object]') {
    arg = {};
  } else if (t === '[object String]') {
    arg = '';
  }
  return new Collection(arg);
};

exports.map = function (fn, ls) {
  var result = Collection.mimicType(ls);
  var listStyle = false;
  exports.each(function (a, b) {
    var m;
    if (listStyle || arguments.length < 2) {
      listStyle || (listStyle = true);
      result.add(fn(a));
    } else {
      m = fn(a, b);
      result.add(m[0], m[1]);
    }
  }, ls);
  return result.value;
};

exports.flatten = function (ls) {
  var result = null;
  exports.each(function (x) {
    if (exports.isList(x)) {
      x = exports.flatten(x);
    } else if (x != null) {
      x = exports.list(x);
    }

    if (x) {
      result = exports.concat(result, x);
    }
  }, ls);
  return result;
};

exports.concat = function (ls) {
  var rest = util.slice(arguments);
  var coll = Collection.mimicType(ls);
  exports.each(function (ls) {
    exports.each(function () {
      coll.add.apply(coll, arguments);
    }, ls);
  }, rest);
  return coll.value;
};

exports.filter = function (fn, ls) {
  var coll = Collection.mimicType(ls);
  exports.each(function (x) {
    fn(x) && coll.add(x);
  }, ls);
  return coll.value;
};

function ReduceError(m) {
  ReduceError.super_.call(this, m);
}
exports.ReduceError = ReduceError;
util.inherits(ReduceError, util.AbstractError);

var _reduce = function (fn, curval, ls, opts) {
  var curvalDefined = arguments.length >= 3;
  if (!curvalDefined) {
    ls = curval;
    curval = null;
  }
  exports.each(function (x) {
    if (!curvalDefined) {
      curval = x;
      curvalDefined = true;
    } else {
      curval = fn(curval, x);
    }
  }, opts, ls);
  if (!curvalDefined) {
    throw new ReduceError('curval must be defined when reducing an ' +
                          'empty list.');
  }
  return curval;
};

exports.reduceLeft = function (fn, curval, ls) {
  return _reduce.apply(this, arguments);
};

exports.reduce = exports.reduceLeft;

exports.reduceRight = function (fn, curval, ls) {
  var args = util.slice(arguments);
  args.push({reverse: true});
  return _reduce.apply(this, args);
};

exports.reverse = function (ls) {
  var node, result;
  if (ls instanceof Cons) {
    node = ls;
    while (node) {
      result = new Cons(undefined, result);
      result.left = node.left;
      node = node.right;
    }
  } else if (ls && ls.length != null) {
    result = [];
    for (var i = 0, len = ls.length; i < len; i++) {
      result.unshift(ls[i]);
    }
  }
  return result;
};

exports.nth = function (n, ls) {
  var i, node;
  if (n < 0) {
    n = datum.length(ls) + n;
  }
  if (ls instanceof Cons) {
    node = ls;
    i = 0;
    while (node && i < n) {
      node = node.right;
      i += 1;
    }
    return node && node.left;
  } else if (ls) {
    return ls[n];
  }
};

