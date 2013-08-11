
var assert = require('assert'),
    lexer = require('../lexer'),
    reader = require('../reader'),
    util = require('../util'),
    stream = require('../stream'),
    datum = require('../datum');

var Parser = reader.Parser;
describe('Parser', function () {
  var A = new lexer.Token('A', 'a'),
      B = new lexer.Token('B', 'b'),
      C = new lexer.Token('C', 'c'),
      D = new lexer.Token('D', 'd'),
      getLex = function (text) {
        return new lexer.Lexer(new stream.Stream(text || 'aabcdacb'),
                               [A, B, C, D]);
      };

  describe('#parse', function () {
    it('should parse a group of tokens and return a list of TokenMatches', function () {
      var toks = [A, A, B];
      var parser = new Parser(getLex()).
        action('Test', [
          toks, function () {
            return this.match;
          }]).
        start('Test');
      var match = parser.parse();

      assert.ok(match);
      assert.equal(toks.length, match.length);

      assert.ok(match[0] instanceof lexer.TokenMatch);
      assert.equal(match[0].token, toks[0]);

      assert.ok(match[1] instanceof lexer.TokenMatch);
      assert.equal(match[1].token, toks[1]);

      assert.ok(match[2] instanceof lexer.TokenMatch);
      assert.equal(match[2].token, toks[2]);
    });

    it('should be able to parse multiple groups of tokens and pick the first match', function () {
      var toks = [A, A, B];
      var cb = function () { return this; };
      var parser = new Parser(getLex()).
        action('Test',
          [[C, A], cb],
          [[A, A, A], cb],
          [B, cb],
          [toks, cb]).
        start('Test');
      var result = parser.parse();
      assert.equal(result.set, toks);
    });

    it('should be able to define actions in terms of actions', function () {
      var parser = new Parser(getLex('abc')).
        action('Item', [A], [B], [C]).
        action('Items', [
          ['Item', 'Item', 'Item'], function (a, b, c) {
            return [a, b, c];
          }]).
        start('Items');
      var result = parser.parse();

      assert.ok(result);
      assert.equal(result.length, 3);
      assert.equal(result[0].token, A);
      assert.equal(result[1].token, B);
      assert.equal(result[2].token, C);
    });

    it('should be able to recusively define actions', function () {
      var parser = new Parser(getLex()).
        action('Item', A, B, C, D).
        action('Items', [
          ['Item', 'Items'], function (item, items) {
            items.unshift(item);
            return items;
          }
        ], [
          'Item', function (item) {
            return [item];
          }
        ]).
        action('Start', [
          ['Items', lexer.EOF]
        ]).
        start('Start');

      var result = parser.parse();
      assert.ok(result);
      assert.equal(parser.lexer.input.data.length, result.length);
      for (var i = 0, len = result.length; i < len; i++) {
        assert.ok(result[i] instanceof lexer.TokenMatch);
      }
    });

    it('should be able to ignore tokens', function () {
      var parser = new Parser(getLex('abc')).
        ignore(B).
        action('Thing', [
          [A, C], function () { return arguments; }
        ]).
        start('Thing');
      var result = parser.parse();
      assert.ok(result);
      assert.equal(A, result[0].token);
      assert.equal(C, result[1].token);
    });
  });
});

var read = reader.read;
describe('read', function () {
  it('should produce a parser that can parse a number', function () {
    var result = read('1');
    assert.equal(result, 1);
  });

  it('should produce a parser that can parse a symbol', function () {
    var result = read('asdf');
    assert.ok(result instanceof datum.Symbol);
    assert.equal('asdf', result.name);
  });

  it('should produce a parser that can parse a simple list', function () {
    var result = read('(1 2 3)'),
        len = 0;
    assert.ok(result instanceof datum.Cons);
    assert.equal(3, datum.length(result));
    var node = result,
        expected = 1;
    while (node) {
      assert.equal(expected, node.left);
      node = node.right;
      expected += 1;
    }
  });

  it('can ignore whitespace at the beginning and end of the input', function () {
    var result = read(' \v \n 1  \t ');
    assert(1, result);
  });
});
