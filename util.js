
var _type = Object.prototype.toString;
exports.type = function (x) {
  return _type.call(x);
};

var _slice = Array.prototype.slice;
exports.slice = function (a, start, end) {
  return _slice.call.apply(_slice, arguments);
};

exports.asArray = function (x) {
  return x && x.length ? x : [x];
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

function Stream(data) {
  this.data = data;
  this._p = 0;
  this._undoPStack = [];
  this._transactionPs = [];
}
exports.Stream = Stream;

Stream.prototype.get = function (offset, length) {
  var result = this.peek.apply(this, arguments);
  this.movePointer(result.length);
  return result;
};

Stream.prototype.getRest = function (offset) {
  var args = exports.slice(arguments);
  args.push(Infinity);
  return this.get.apply(this, args);
};

Stream.prototype.peek = function (offset, length) {
  if (arguments.length >= 2) {
    this._p = offset;
  } else {
    length = offset;
  }

  return (length == null || length === 1) ?
    this.data.charAt(this._p) :
    this.data.substr(this._p, length);
};

Stream.prototype.peekRest = function (offset) {
  var args = exports.slice(arguments);
  args.push(Infinity);
  return this.peek.apply(this, args);
};

Stream.prototype.begin = function () {
  this._transactionPs.push(this._p);
  return this;
};

Stream.prototype.commit = function () {
  if (!this._transactionPs.length) {
    throw new Stream.TransactionError().commit();
  }
  return {
    start: this._transactionPs.pop(),
    end: this._p
  };
};

Stream.prototype.rollback = function () {
  if (!this._transactionPs.length) {
    throw new Stream.TransactionError().rollback();
  }
  this._p = this._transactionPs.pop();
  return this;
};

Stream.prototype.movePointer = function (n) {
  return this.setPointer(this._p + n);
};

Stream.prototype.getPointer = function () {
  return this._p;
};

Stream.prototype.setPointer = function (p) {
  this._undoPStack.push(this._p);
  this._p = p;
  return this;
};

Stream.prototype.undo = function () {
  var _p = this._undoPStack.pop();
  this._p = _p != null ? _p : this._p;
  return this;
};

Stream.prototype.exhausted = function () {
  return this._p >= this.data.length;
};

Stream.TransactionError = function () {};
Stream.TransactionError.prototype = exports.clone(Error.prototype);
Stream.TransactionError.prototype.constructor = Stream.TransactionError;

Stream.TransactionError.prototype.commit = function () {
  this.message = 'Can\'t commit a transaction when no transaction was begun';
  return this;
};

Stream.TransactionError.prototype.rollback = function () {
  this.message = 'Can\'t rollback when no transaction was begun';
  return this;
};
