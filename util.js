
var _type = Object.prototype.toString;
exports.type = function (x) {
  return _type.call(x);
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

exports.clone = Object.create || function (x) {
  var noop = function () {};
  noop.prototype = x;
  return new noop;
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

