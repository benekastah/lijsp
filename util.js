
var _type = Object.prototype.toString;
exports.type = function (x) {
  return _type.call(x);
};

exports.typeIsArrayLike = function (typeString) {
  return typeString === '[object Array]' ||
    typeString === '[object Arguments]';
};

var _slice = Array.prototype.slice;
exports.slice = function (a, start, end) {
  return _slice.call.apply(_slice, arguments);
};

exports.asArray = function (x) {
  return exports.type(x) === '[object Array]' ? x : [x];
};

var _indexOf = Array.prototype.indexOf || function (x) {
  for (var i = 0, len = this.length; i < len; i++) {
    if (this[i] === x) {
      return i;
    }
  }
  return -1;
};

exports.indexOf = function (a, x) {
  return _indexOf.call(a, x);
};

exports.contains = function (a, x) {
  return exports.indexOf(a, x) >= 0;
};

var _hasGenerators;
exports.hasGenerators = function () {
  if (_hasGenerators == null) {
    try {
      eval('(function* () {});');
      _hasGenerators = true;
    } catch (e) {
      _hasGenerators = false;
    }
  }
  return _hasGenerators;
};

exports.allKeys = function (o) {
  var ks = [];
  for (var k in o) {
    ks.push(k);
  }
  return ks;
};

var _hasProp = Object.prototype.hasOwnProperty;
exports.keys = Object.keys || function () {
  var ks = [];
  for (var k in o) {
    if (_hasProp.call(o, k)) {
      ks.push(k);
    }
  }
  return ks;
};

exports.clone = Object.create || function (x) {
  var noop = function () {};
  noop.prototype = x;
  return new noop;
};

exports.inherits = function (Child, Parent) {
  Child.prototype = exports.clone(Parent.prototype);
  Child.prototype.constructor = Child;
  Child.super_ = Parent;
};

exports.getPrototypeOf = Object.getPrototypeOf || function (o) {
  if (o && '__proto__' in o) {
    return o.__proto__;
  } else if (o && o.constructor) {
    return o.constructor.prototype;
  }
};

var _bind = Function.prototype.bind || function (scope) {
  var fn = this;
  var args = exports.slice(arguments, 1);
  return function () {
    var _args = args.concat(exports.slice(arguments));
    fn.apply(scope, _args);
  };
};

exports.bind = function (fn) {
  var args = exports.slice(arguments, 1);
  return _bind.apply(fn, args);
};

function AbstractError(msg) {
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  }
  this.message = this.constructor.name || 'Error';
  if (msg != null) {
    this.message += ': ' + msg;
  }
}
exports.AbstractError = AbstractError;
exports.inherits(AbstractError, Error);
