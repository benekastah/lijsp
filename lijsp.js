
var util = require('./util'),
    stream = require('./stream'),
    compiler = require('./javascript_compiler'),
    reader = require('./reader'),
    lexer = require('./lexer');

debugger;
exports.compile = function (stream) {
  debugger;
  var comp = compiler.makeCompiler(
    reader.makeParser(
      lexer.makeLexer(stream)));
  return comp.compile();
};

exports.compileString = function (string) {
  return exports.compile(new stream.Stream(string));
};
