
var assert = require('assert'),
    Iterable = require('../iterable/iterable'),
    datum = require('../datum');

describe('Iterable', function () {
  var test = function (ls, opts) {
    var iter = new Iterable(ls, opts),
        results = [],
        item, i;
    while (!(item = iter.next()).done) {
      results.push(item.value);
    }
    results.sort();
    i = 1;
    assert.equal(4, results.length);
    while ((item = results.shift())) {
      assert.equal(i, item);
      i += 1;
    }
  };

  var keyTest = function (ls, opts) {
    var iter = new Iterable(ls, opts || {keys: true}),
        results = [],
        item;
    while (!(item = iter.next()).done) {
      results.push(item.value);
    }
    while ((item = results.shift())) {
      assert.equal(ls[item[0]], item[1]);
    }
  };

  it('should be able to iterate over a list', function () {
    var ls = datum.list(1, 2, 3, 4);
    test(ls);
  });

  it('should be able to iterate over a list in reverse', function () {
    var ls = datum.list(4, 3, 2, 1);
    test(ls);
  });

  it('should be able to iterate over an array', function () {
    test([1, 2, 3, 4]);
  });

  it('should be able to iterate over an array in reverse', function () {
    test([4, 3, 2, 1]);
  });

  it('should be able to iterate over an array with keys', function () {
    keyTest([1, 2, 3, 4]);
  });

  it('should be able to iterate over the arguments object', function () {
    (function () {
      test(arguments);
    })(1, 2, 3, 4);
  });

  it('should be able to iterate over the arguments object', function () {
    (function () {
      test(arguments);
    })(4, 3, 2, 1);
  });

  it('should be able to iterate over the arguments object with keys', function () {
    (function () {
      keyTest(arguments);
    })(1, 2, 3, 4);
  });

  it('should be able to iterate over an object', function () {
    test({a: 1, b: 2, c: 3, d: 4}, {keys: false});
  });

  it('should be able to iterate over an object with keys', function () {
    keyTest({a: 1, b: 2, c: 3, d: 4}, null);
  });

  it('should be able to iterate over a string', function () {
    test('1234');
  });

  it('should be able to iterate over a string in reverse', function () {
    test('4321');
  });

  it('should be able to iterate over a string with keys', function () {
    keyTest('1234');
  });
});
