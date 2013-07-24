
var Iterable = require('./iterable'),
    util = require('../util');

var wrap = function (v, d) {
  if (arguments.length < 2) {
    d = false;
  }
  return {value: v, done: !!d};
};

Iterable.prototype._setUpList = function () {
  this._currentIter = this.iter;
  this.next = listNext;
};

var listNext = function () {
  var result;
  if (this._currentIter) {
    result = this._currentIter.left;
    this._currentIter = this._currentIter.right;
    return wrap(result);
  } else {
    return this.complete();
  }
};

Iterable.prototype._setUpArray = function () {
  if (this.options.reverse) {
    this._i = this.iter.length - 1;
  } else {
    this._i = 0;
    this._len = this.iter.length;
  }
  this._get = arrayGet;
  this.next = arrayNext;
};

var arrayGet = function (iter, i) {
  return iter[i];
};

var arrayNext = function () {
  var keys = this.options.keys,
      reverse = this.options.reverse;
  if (reverse ?
        this._i >= 0 :
        this._i < this._len) {
    var i = this._i,
        v = this._get(this.iter, i);
    if (reverse) {
      this._i -= 1;
    } else {
      this._i += 1;
    }
    return wrap(keys ? [i, v] : v);
  } else {
    return this.complete();
  }
};

Iterable.prototype._setUpString = function () {
  this._setUpArray();
  this._get = stringGet;
};

var stringGet = function (iter, i) {
  return iter.charAt(i);
};

Iterable.prototype._setUpObject = function () {
  this._keys = new Iterable(util.keys(this.iter));
  this.next = objectNext;
};

var objectNext = function () {
  var nextKey = this._keys.next(),
      k = nextKey.value,
      keys = this.options.keys;
  if (nextKey.done) {
    return nextKey;
  }
  var v = this.iter[k];
  return wrap(keys ? [k, v] : v);
};

