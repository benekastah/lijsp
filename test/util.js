
var assert = require('assert'),
    util = require('../util');

describe('asArray', function () {
  it('should return an array with a non-array argument as sole member', function () {
    assert.deepEqual([5], util.asArray(5));
  });

  it('should return an array argument untouched', function () {
    var a = [1, 2, 3];
    assert.equal(a, util.asArray(a));
  });
});

describe('indexOf', function () {
  it('returns the first index of an element in an array', function () {
    var a = [1, 2, 3, 2];
    assert.equal(1, util.indexOf(a, 2));
  });
});

describe('contains', function () {
  it('returns true if the item is in the array, false otherwise', function () {
    var a = [1, 2, 3, 4, 5, 6, 7];
    assert.ok(util.contains(a, 4));
    assert.ok(!util.contains(a, 8));
  });
});

describe('clone', function () {
  it('should make a new object with the input as prototype', function () {
    var base = {a: 1};
    var cln = util.clone(base);
    assert.equal(base, util.getPrototypeOf(cln));
  });
});

describe('getPrototypeOf', function () {
  it('should get the prototype of an object', function () {
    assert.equal(Object.prototype, util.getPrototypeOf({}));
  });
});

describe('bind', function () {
  it('should return a bound function', function () {
    var add = function (a, b) {
      return a + b + this.c;
    };
    assert.equal(4, util.bind(add, {c: 2}, 1, 1)());
    assert.equal(4, util.bind(add, {c: 2}, 1)(1));
  });
});
