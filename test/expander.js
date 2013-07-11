
var assert =  require('assert'),
    expander = require('../expander'),
    datum = require('../datum');

describe('compare', function () {
  it('should be able to compare simple values', function () {
    assert.ok(expander.compare(1, 1), 'identical numbers');
    assert.ok(expander.compare('asdf', 'asdf'), 'identical strings');
    assert.ok(expander.compare(null, null), 'identical null');
    assert.ok(expander.compare(undefined, undefined), 'identical undefined');

    assert.ok(!expander.compare(1, 2), 'unequal numbers');
    assert.ok(!expander.compare('asdf', 'fdsa'), 'unequal strings');

    assert.ok(!expander.compare(null, undefined), 'null is not undefined');
    assert.ok(!expander.compare(1, 'asdf'), 'a number is not a string');
    assert.ok(!expander.compare(null, 'asdf'), 'null is not a string');
  });

  it('should be able to compare symbols', function () {
    assert.ok(
      expander.compare(
        new datum.Symbol('asdf'),
        new datum.Symbol('asdf')),
      'two non-identical symbols with same name');
    assert.ok(
      !expander.compare(
        new datum.Symbol('asdf'),
        new datum.Symbol('fdsa')),
      'symbols with different name');
  });

  it('should be able to compare template symbols to anything', function () {
    assert.ok(
      expander.compare(
        new datum.Symbol('$a'),
        1),
      '$a can be 1');
    assert.ok(
      expander.compare(
        new datum.Symbol('$hey-there'),
        new datum.Cons(1)),
      '$hey-there can be a list');
  });

  it('should compare a list recursively', function () {
    assert.ok(
      expander.compare(
        datum.list(
          new datum.Symbol('$a'),
          new datum.Symbol('+'),
          new datum.Symbol('$b')),
        datum.list(1, new datum.Symbol('+'), 2)),
      'complex list pass');
    assert.ok(
      !expander.compare(
        datum.list(
          new datum.Symbol('$a'),
          new datum.Symbol('+'),
          new datum.Symbol('$b')),
        datum.list(1, new datum.Symbol('-'), 2)),
      'complex list fail');
    assert.ok(
      expander.compare(
        datum.list(1, 2, 3),
        datum.list(1, 2, 3)),
      'simple list pass');
    assert.ok(
      !expander.compare(
        datum.list(1, 2, 3),
        datum.list(3, 2, 1)),
      'simple list fail');
  });

  it('should fail lists that don\'t have the same number of elements', function () {
    assert.ok(
      !expander.compare(
        datum.list(1, 2, 3),
        datum.list(1, 2, 3, 4)),
      'length mismatch 1');
    assert.ok(
      !expander.compare(
        datum.list(1, 2, 3),
        datum.list(1, 2)),
      'length mismatch 2');
  });

  it('should be able to gather rest arguments', function () {
    var match = expander.compare(
      datum.list(
        datum.symbol('$a'),
        datum.symbol('$$rest')),
      datum.list(1, 2, 3));
    var a = match[1];
    var rest = match[2];
    assert.equal(1, a);
    assert.equal(2, rest.left);
    assert.equal(3, rest.right.left);
  });

  it('should treat allow functions to perform custom compare actions', function () {
    assert.ok(expander.compare(function () { return true; }, null));
  });
});

describe('Expander', function () {
  describe('#expandRuleset', function () {
    it('should match a template with an ast and perform the related action', function () {
      var e = new expander.Expander();
      e.addRule(new datum.Symbol('one'), function () {
        return 1;
      });
      e.addRule(datum.list(
        new datum.Symbol('$a'),
        new datum.Symbol('+'),
        new datum.Symbol('$b')),
      function (ast, a, b) {
        return a + b;
      });
      assert.equal(1, e.expand(new datum.Symbol('one')));
      var two = new datum.Symbol('two');
      assert.equal(two, e.expand(two));
      assert.equal(3, e.expand(datum.list(1, new datum.Symbol('+'), 2)));
    });
  });
});
