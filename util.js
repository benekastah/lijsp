
function Stream(data) {
  this.data = data;
  this._p = 0;
  this._transactionPs = [];
}
exports.Stream = Stream;

Stream.prototype.get = function (offset, length) {
  if (arguments.length >= 2) {
    this._p = offset;
  } else {
    length = offset;
  }

  var result = this.peek(length);
  this._p += result.length;

  return result;
};

Stream.prototype.peek = function (length) {
  return (length == null || length === 1) ?
    this.data.charAt(this._p) :
    this.data.substr(this._p, length);
};

Stream.prototype.begin = function () {
  this._transactionPs.push(this._p);
  return this;
};

Stream.prototype.commit = function () {
  if (!this._transactionPs.length) {
    throw 'Can\'t commit a transaction when no transaction was begun';
  }
  return {
    start: this._transactionPs.pop(),
    end: this._p
  };
};

Stream.prototype.rollback = function () {
  if (!this._transactionPs.length) {
    throw 'Can\'t rollback when no transaction was begun';
  }
  this._p = this._transactionPs.pop();
  return this;
};

Stream.prototype.movePointer = function (x) {
  this._p += x;
  return this;
};

Stream.prototype.match = function (re) {
  console.assert(re.source.charAt(0) === '^');
  console.assert(!re.global);
  var match = this.data.substr(this._p).match(re);
  if (match) {
    this._lastPeek = match[0];
    return match;
  }
};

Stream.prototype.exhausted = function () {
  return this._p >= this.data.length;
};