
var util = require('./util'),
    stream = require('./stream'),
    compiler = require('./javascript_compiler'),
    reader = require('./reader'),
    lexer = require('./lexer');

exports.compile = function (str, opts) {
  var comp = compiler.makeCompiler(reader.makeParser(str), opts);
  return comp.compile();
};

exports.compileString = exports.compile;
