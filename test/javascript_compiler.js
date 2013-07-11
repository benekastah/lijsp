
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
      assert.equal('new Cons(1, 2);', output.data);
    });

    it('should compile a binary operation', function () {
      var output;
      output = lijsp.compileString('(@<+> 1 2)');
      assert.equal('(1 + 2);', output.data);
      output = lijsp.compileString('(@<+> 1 2 3)');
      assert.equal('(1 + 2 + 3);', output.data);
    });

    it('should compile a prefix unary operation', function () {
      debugger;
      var output = lijsp.compileString('(@<new> (A 1))');
      assert.equal('(new A(1));', output.data);
    });

    it('should compile a suffix unary operation', function () {
      var output = lijsp.compileString('(a @<++>)');
      assert.equal('(a ++);', output.data);
    });
  });
});
