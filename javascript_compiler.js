
var stream = require('./stream'),
    util = require('./util'),
    datum = require('./datum'),
    lexer = require('./lexer'),
    reader = require('./reader'),
    expander = require('./expander'),
    undefined;

function CompileError(m) {
  if (m) {
    this.message = this.message + ': ' + m;
  }
}
exports.CompileError = CompileError;
util.inherits(CompileError, Error);
CompileError.prototype.message = CompileError.name;

function Compiler(parser, exp) {
  Compiler.super_.call(this);
  // Since all compiler rules produce strings and strings are also valid
  // input for a compiler rule, prevent expanding previously expanded
  // values.
  this.expandExpanded = false;

  this.parser = parser;
  this.expander = exp || expander.makeExpander();
  this.output = new stream.WritableStream();
  this.compileAst = util.bind(this.compileAst, this);
}
exports.Compiler = Compiler;
util.inherits(Compiler, expander.Expander);

Compiler.prototype.compile = function () {
  var ast;
  while ((ast = this.parser.parse()) !== lexer.EOF) {
    this.output.append(this.compileAst(ast) + ';');
  }
  return new stream.Stream(this.output.data);
};

Compiler.prototype.compileAst = function (ast) {
  ast = this.expander.expand(ast);
  compiled = this.expand(ast);
  if (compiled === ast) {
    throw new CompileError('Can\'t compile: ' + ast.constructor.name);
  }
  return compiled;
};


exports.makeCompiler = function (parser) {
  var compiler = new Compiler(parser);

  compiler.addRule(expander.type('[object Number]'), function (n) {
    return '' + n;
  });

  compiler.addRule(datum.list(
    expander.type(datum.Operator),
    datum.symbol('$a'),
    datum.symbol('$b'),
    datum.symbol('$$rest')), function (ast, a, b, rest) {
    var op = ast.left;
    args = new datum.Cons(b, rest);
    args = new datum.Cons(a, args);
    return '(' + datum.join(
      datum.map(compiler.compileAst, args), ['', op.name, ''].join(' ')) +
      ')';
  });

  compiler.addRule(datum.list(
    expander.type(datum.Operator),
    datum.symbol('$expr')), function (ast, expr) {
    var op = ast.left;
    return '(' + op.name + ' ' + compiler.compileAst(expr) + ')';
  });

  compiler.addRule(datum.list(
    datum.symbol('$expr'),
    expander.type(datum.Operator)), function (ast, expr) {
    var op = ast.right.left;
    return '(' + compiler.compileAst(expr) + ' ' + op.name + ')';
  });

  compiler.addRule(expander.type(datum.ThisOperator), function () {
    return 'this';
  });

  compiler.addRule(datum.list(
    datum.symbol('$fn'), datum.symbol('$$args')), function (ls, fn, args) {
    return compiler.compileAst(fn) + '(' +
      datum.join(datum.map(compiler.compileAst, args), ', ') + ')';
  });

  compiler.addRule(expander.type(datum.Cons), function (cons) {
    return 'new Cons(' +
      datum.join(
        datum.map(compiler.compileAst, [cons.left, cons.right]),
        ', ') + ')';
  });

  compiler.addRule(expander.type(datum.Symbol), function (sym) {
    return sym.escapedName();
  });

  return compiler;
};
