
var util = require('./util');

function Symbol(name) {
  this.name = name;
}
exports.Symbol = Symbol;

Symbol.prototype.re_unsafe = /^\d|[^\w]/g;

Symbol.prototype.escapedName = function () {
  return this.name.replace(this.re_unsafe, function (match) {
    return '_$' + match.charCodeAt(0).toString(32) + '$_';
  });
};

function TemplateSymbol(name) {
  Symbol.call(this, name);
}
exports.TemplateSymbol = TemplateSymbol;
util.inherits(TemplateSymbol, Symbol);

function Cons(left, right) {
  this.left = left;
  this.right = right;
}
exports.Cons = Cons;

exports.cons = function (left, right) {
  return new Cons(left, right);
};

exports.list = function () {
  var result;
  for (var i = arguments.length - 1; i >= 0; i--) {
    result = new Cons(arguments[i], result);
  }
  return result;
};

exports.isList = function (ls) {
  var result = !!ls;
  while (result && ls) {
    result = ls instanceof Cons;
    ls = ls.right;
  }
  return result;
};

exports.length = function (ls) {
  var next = ls, result = 0;
  if (ls instanceof Cons) {
    while (next) {
      result += 1;
      next = next.right;
    }
  } else if (ls && ls.length != null) {
    result = ls.length;
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

exports.last = function (ls) {
  if (ls instanceof Cons) {
    while (ls) {
      if (!ls.right) {
        return ls.left;
      }
      ls = ls.right;
    }
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
  var result, currentResult;
  if (ls instanceof Cons) {
    result = currentResult = new Cons();
    while (currentResult) {
      currentResult.left = ls.left;
      currentResult = currentResult.right = ls.right.right ? new Cons() : null;
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

exports.each = function (fn, ls) {
  var node, result;
  if (ls instanceof Cons) {
    node = ls;
    while (node) {
      result = fn(node.left);
      if (result === false) {
        return;
      }
      node = node.right;
    }
  } else if (ls && ls.length != null) {
    for (i = 0, len = ls.length; i < len; i++) {
      result = fn(ls[i]);
      if (result === false) {
        return;
      }
    }
  }
};

exports.map = function (fn, ls) {
  var result, currentResult, node;
  if (ls instanceof Cons) {
    result = currentResult = new Cons();
    node = ls;
    while (node) {
      currentResult.left = fn(node.left);
      node = node.right;
      currentResult = currentResult.right = node ? new Cons() : null;
    }
  } else if (ls && ls.length != null) {
    result = [];
    for (i = 0, len = ls.length; i < len; i++) {
      result.push(fn(ls[i]));
    }
  }
  return result;
};

exports.filter = function (fn, ls) {

};

exports.reduce = function (fn, ls) {

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
