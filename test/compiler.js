
var assert = require('assert'),
    compiler = require('../compiler');

var Compiler = compiler.Compiler;
describe('Compiler', function () {
  describe('#compile', function () {
    it('should return a stream of javascript code', function () {
      var output = compiler.compileString('1');
      assert.equal('1;', output.data);
    });

    it('should compile a list as a function call', function () {
      var output = compiler.compileString('(add 1 2)');
      assert.equal('add(1, 2);', output.data);
    });

    it('should compile a pair as a cons cell', function () {
      var output = compiler.compileString('(1 . 2)');
      assert.equal('new Cons(1, 2);', output.data);
    });
  });
});
