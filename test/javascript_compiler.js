
var assert = require('assert'),
    compiler = require('../javascript_compiler'),
    lijsp = require('../lijsp');

var Compiler = compiler.Compiler;
describe('Compiler', function () {
  describe('#compile', function () {
    it('should return a stream of javascript code', function () {
      var output = lijsp.compileString('1');
      assert.equal('1;', output.data);
    });

    it('should compile a list as a function call', function () {
      var output = lijsp.compileString('(add 1 2)');
      assert.equal('add(1, 2);', output.data);
    });

    it('should compile a pair as a cons cell', function () {
      var output = lijsp.compileString('(1 . 2)');
      assert.equal('cons(1, 2);', output.data);
    });

    it('should compile a binary operation', function () {
      var output;
      debugger;
      output = lijsp.compileString('(@<+> 1 2)');
      assert.equal('(1 + 2);', output.data);
      output = lijsp.compileString('(@<+> 1 2 3)');
      assert.equal('(1 + 2 + 3);', output.data);
    });

    it('should compile a prefix unary operation', function () {
      var output = lijsp.compileString('(@<new> (A 1))');
      assert.equal('(new A(1));', output.data);
    });

    it('should compile a suffix unary operation', function () {
      var output = lijsp.compileString('(a @<++>)');
      assert.equal('(a ++);', output.data);
    });

    it('should compile this', function () {
      var output = lijsp.compileString('@<this>');
      assert.equal('this;', output.data);
      output = lijsp.compileString('(a @<this>)');
      assert.equal('a(this);', output.data);
    });

    it('should compile void', function () {
      var output = lijsp.compileString('@<void>');
      assert.equal('void(0);', output.data);
      output = lijsp.compileString('(a @<void>)');
      assert.equal('a(void(0));', output.data);
    });

    it('should compile a var statement', function () {
      var output = lijsp.compileString('(@<var> a b c)');
      assert.equal('var a, b, c;', output.data);
      output = lijsp.compileString('(@<var> (a 1) b (c 3))');
      assert.equal('var a = 1, b, c = 3;', output.data);
    });

    it('should compile a function statement', function () {
      var output = lijsp.compileString('(@<function> (a b) ((@<+> a b)))');
      assert.equal('(function (a, b) { (a + b); });', output.data);
      output = lijsp.compileString('(@<function> () ())');
      assert.equal('(function () {  });', output.data);
      output = lijsp.compileString('(@<function> asdf () (asdf))');
      assert.equal('function asdf() { asdf; };', output.data);
    });

    it('should compile property access', function () {
      var output = lijsp.compileString('(@<.> a \'b c)');
      assert.equal('a.b[c];', output.data);
    });
  });
});
