
var assert =  require('assert'),
    expander = require('../expander'),
    datum = require('../datum');

describe('getTemplateVariables', function () {
  var testResult = function (result, a, b) {
    assert.ok(result);
    assert.equal(2, datum.length(result));
    assert.equal(a, datum.first(result));
    assert.equal(b, datum.second(result));
  };

  it('should be able to extract a template variable from a flat list', function () {
    var a = datum.symbol('$a'),
        b = datum.symbol('$b');
    var pattern = datum.list(a, b, datum.symbol('c'));
    var result = expander.getTemplateVariables(pattern);
    testResult(result, a, b);
  });

  it('should be able to extract a template variable from a nested list', function () {
    var a = datum.symbol('$a'),
        b = datum.symbol('$b');
    var pattern = datum.list(
      datum.list(datum.symbol('quote'), a), b, datum.symbol('c'));
    var result = expander.getTemplateVariables(pattern);
    testResult(result, a, b);
  });
});

describe('resolveTemplateVariables', function () {
  it('should be able to convert symbols to template variables in a list', function () {
    var ls = datum.list(1, 2, datum.symbol('$a'),
                        datum.list(datum.symbol('$$b')));
    var result = expander.resolveTemplateVariables(ls);
    assert.equal(1, datum.nth(0, result));
    assert.equal(2, datum.nth(1, result));
    assert.ok(datum.nth(2, result) instanceof datum.TemplateVariable,
             '$a was not converted to template variable');
    assert.ok(datum.first(datum.nth(3, result)) instanceof
              datum.TemplateRestVariable,
             '$$b was not converted to template variable');
  });

  it('should be able to convert symbol to template variable', function () {
    var s = datum.symbol('$c');
    var result = expander.resolveTemplateVariables(s);
    assert.ok(result instanceof datum.TemplateVariable,
             '$c was not converted to template variable');
  });
});

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
        expander.toTemplateVariable(new datum.Symbol('$a')),
        1),
      '$a can be 1');
    assert.ok(
      expander.compare(
        expander.toTemplateVariable(new datum.Symbol('$hey-there')),
        new datum.Cons(1)),
      '$hey-there can be a list');
  });

  it('should compare a list recursively', function () {
    assert.ok(
      expander.compare(
        expander.resolveTemplateVariables(
          datum.list(
            new datum.Symbol('$a'),
            new datum.Symbol('+'),
            new datum.Symbol('$b'))),
        datum.list(1, new datum.Symbol('+'), 2)),
      'complex list pass');
    assert.ok(
      !expander.compare(
        expander.resolveTemplateVariables(
          datum.list(
            new datum.Symbol('$a'),
            new datum.Symbol('+'),
            new datum.Symbol('$b'))),
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
      expander.resolveTemplateVariables(
        datum.list(
          datum.symbol('$a'),
          datum.symbol('$$rest'))),
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
