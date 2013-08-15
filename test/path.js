
var path = require('../path'),
    nodePath = require('path'),
    assert = require('assert');

describe('join', function () {
  it('should behave like node\'s path.join', function () {
    var parts = ['a', 'b/', '/c/', 'd', 'e'];
    assert.equal(
      nodePath.join.apply(nodePath, parts),
      path.join.apply(path, parts));
  });
});

describe('dirname', function () {
  it('should behave like node\'s path.dirname', function () {
    var p = '/a/b/c/d';
    assert.equal(nodePath.dirname(p), path.dirname(p));
  });
});

describe('basename', function () {
  it('should behave like node\'s path.basename', function () {
    var p = '/a/b/c/d';
    assert.equal(nodePath.basename(p), path.basename(p));
  });
});

describe('relative', function () {
  it('should behave like node\'s path.relative', function () {
    var p1 = '/a/b/c/d';
    var p2 = '/a/b/e/f/g/h';
    assert.equal(nodePath.relative(p1, p2), path.relative(p1, p2));
    assert.equal(nodePath.relative(p2, p1), path.relative(p2, p1));
  });
});
