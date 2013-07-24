var Iterable = require('./iterable.js'),
    datum = require('../datum.js');

var getNext = function (_this, gfun) {
  var g = gfun(_this.iter, _this.options);
  return g.next.bind(g);
};

Iterable.prototype._setUpList = function () {
  this.next = getNext(this, listNext);
};

var listNext = function* (ls, opts) {
  var cur = opts.reverse ? datum.reverse(ls) : ls;
  while (cur) {
    yield cur.left;
    cur = cur.right;
  }
};

Iterable.prototype._setUpArray = function () {
  this.next = getNext(
    this,
    this.options.reverse ?
      arrayNextReverse :
      arrayNext);
};

var arrayNext = function* (a, opts) {
  for (var i = 0, len = a.length; i < len; i++) {
    var v = a[i];
    yield opts.keys ? [i, v] : v;
  }
};

var arrayNextReverse = function* (a, opts) {
  for (var i = a.length - 1; i >= 0; i--) {
    var v = a[i];
    yield opts.keys ? [i, v] : v;
  }
};

Iterable.prototype._setUpString = function () {
  this.next = getNext(
    this,
    this.options.reverse ?
      stringNextReverse :
      stringNext);
};

var stringNext = function* (s, opts) {
  for (var i = 0, len = s.length; i < len; i++) {
    var c = s.charAt(i);
    yield opts.keys ? [i, c] : c;
  }
};

var stringNextReverse = function* (s, opts) {
  for (var i = s.length - 1; i >= 0; i--) {
    var c = s.charAt(i);
    yield opts.keys ? [i, c] : c;
  }
};

Iterable.prototype._setUpObject = function () {
  this.next = getNext(this, objectNext);
};

var objectNext = function* (o, opts) {
  for (var k in o) {
    var v = o[k];
    yield opts.keys ? [k, v] : v;
  }
};


