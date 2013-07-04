
var assert = require('assert'),
    lexer = require('../lexer'),
    util = require('../util'),
    stream = require('../stream');

var Token = lexer.Token;
describe('Token', function () {
  it('should set a name property', function () {
    var t = new Token('test');
    assert.equal('test', t.name);
  });

  it('should add patterns passed into the constructor', function () {
    var t = new Token('test', ['a', 'b', 'c']);
    assert.equal(3, t.patterns.length);
  });

  describe('#addPattern', function () {
    it('should fail when the pattern is of an invalid type', function () {
      var t = new Token('test');
      assert.throws(function () {
        t.addPattern(1);
      }, Token.InvalidPattern);

      assert.throws(function () {
        t.addPattern({});
      }, Token.InvalidPattern);
    });

    it('should add values to the instance array patterns', function () {
      var t = new Token('test');
      t.addPattern(/a/);
      t.addPattern('b');
      assert.equal(2, t.patterns.length);
      assert.ok(t.patterns[0] instanceof RegExp);
      assert.ok(typeof t.patterns[1] === 'string');
    });

    it('should ensure RegExp patterns match from the beginning of the input string', function () {
      var t = new Token('test');
      t.addPattern(/a/);
      t.addPattern(/b/);
      assert.equal('^a', t.patterns[0].source);
      assert.equal('^b', t.patterns[1].source);
    });

    it('should never add global RegExps', function () {
      var t = new Token('test');
      t.addPattern(/a/);
      t.addPattern(/b/);
      assert.ok(!t.patterns[0].global);
      assert.ok(!t.patterns[1].global);
    });
  });

  describe('#match', function () {
    var tA = new Token('A', [/a/]),
        tS = new Token('S', ['s']),
        tDf = new Token('DF', [/df?f/, 'dF', /df/i]);

    it('should return a TokenMatch instance with each match', function () {
      var input = new stream.Stream('asdf');
      assert.ok(tA.match(input) instanceof lexer.TokenMatch,
                'tA should match');
      assert.ok(tS.match(input) instanceof lexer.TokenMatch,
                'tS should match');
      assert.ok(tDf.match(input) instanceof lexer.TokenMatch,
                'tDf should match');
    });

    it('should return undefined with each non-match', function () {
      var input = new stream.Stream('fdsa');
      assert.ok(tA.match(input) === void 0);
    });

    it('should produce a match from the first matching pattern', function () {
      var input = new stream.Stream('dF');
      var match = tDf.match(input);
      assert.ok(match);
      assert.equal('dF', match.matchText);
    });
  });
});

var Lexer = lexer.Lexer;
describe('Lexer', function () {
  describe('#lex', function () {
    it('should throw Lexer.Error when it can\'t produce a match', function () {
      var lex = new Lexer(new stream.Stream('b'), [
        new Token('A', ['a'])
      ]);
      assert.throws(function () {
        lex.lex();
      }, Lexer.Error);
    });

    it('should produce one TokenMatch each time it is called', function () {
      var lex = new Lexer(new stream.Stream('aabcacb'), [
        new Token('A', [/a+/]),
        new Token('B', ['b']),
        new Token('C', ['c'])
      ]);
      assert.ok(lex.lex() instanceof lexer.TokenMatch);
      assert.ok(lex.lex() instanceof lexer.TokenMatch);
      assert.ok(lex.lex() instanceof lexer.TokenMatch);
      assert.ok(lex.lex() instanceof lexer.TokenMatch);
      assert.ok(lex.lex() instanceof lexer.TokenMatch);
    });

    it('should produce an EOF TokenMatch when input is exhausted', function () {
      var lex = new Lexer(new stream.Stream(''));
      var match = lex.lex();
      assert.ok(match);
      assert.equal(lexer.EOF, match.token);
    });
  });
});
