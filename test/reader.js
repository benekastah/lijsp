
var assert = require('assert'),
    lexer = require('../lexer'),
    reader = require('../reader'),
    util = require('../util');

var Parser = reader.Parser;
describe('Parser', function () {
  var A = new lexer.Token('A', 'a'),
      B = new lexer.Token('B', 'b'),
      C = new lexer.Token('C', 'c'),
      D = new lexer.Token('D', 'd'),
      getLex = function () {
        return new lexer.Lexer(new util.Stream('aabcdacb'), [A, B, C, D]);
      };

  describe('#parse', function () {
    it('should parse a group of tokens and return a list of TokemMatches', function () {
      var parser = new Parser(getLex());
      var toks = [A, A, B];
      var result = parser.parse(toks);

      assert.ok(result);
      assert.equal(toks.length, result.match.length);

      assert.ok(result.match[0] instanceof lexer.TokenMatch);
      assert.equal(result.match[0].token, toks[0]);

      assert.ok(result.match[1] instanceof lexer.TokenMatch);
      assert.equal(result.match[1].token, toks[1]);

      assert.ok(result.match[2] instanceof lexer.TokenMatch);
      assert.equal(result.match[2].token, toks[2]);
    });

    it('should be able to parse multiple groups of tokens and pick the first match', function () {
      var parser = new Parser(getLex());
      var toks = [A, A, B];
      var result = parser.parse(
        [C, A],
        [A, A, A],
        B,
        toks);

      assert.equal(result.set, toks);
    });

    it('should be able to detect simple parse conflicts', function () {
      var parser = new Parser(getLex());
      assert.throws(function () {
        parser.parse(
          [A, A, B],
          A);
      }, Parser.Conflict);
    });
  });
});
