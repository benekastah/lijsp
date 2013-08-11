
var util = require('./util');

function Stream(data) {
  this.data = data != null ? data : '';
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
  var args = util.slice(arguments);
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
  var args = util.slice(arguments);
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

function TransactionError() {
  TransactionError.super_.call(this);
}
util.inherits(TransactionError, util.AbstractError);
Stream.TransactionError = TransactionError;

Stream.TransactionError.prototype.commit = function () {
  this.message = 'Can\'t commit a transaction when no transaction was begun';
  return this;
};

Stream.TransactionError.prototype.rollback = function () {
  this.message = 'Can\'t rollback when no transaction was begun';
  return this;
};


function WritableStream(data) {
  return Stream.call(this, data);
}
exports.WritableStream = WritableStream;

util.inherits(WritableStream, Stream);

WritableStream.prototype.set = function (data) {
  var before = '',
      after = '',
      _p = this._p;
  this.movePointer(data.length);
  if (_p > 0) {
    before = this.data.substr(0, _p);
  }
  if (_p < this.data.length) {
    after = this.data.substr(_p + data.length);
  }
  this.data = before + data + after;
  return this;
};

WritableStream.prototype.append = function (data) {
  this.setPointer(this.data.length);
  this.set(data);
  return this;
};
