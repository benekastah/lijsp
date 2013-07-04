
var stream = require('./stream'),
    util = require('./util'),
    datum = require('./datum'),
    lexer = require('./lexer'),
    reader = require('./reader');

function NotImplemented(m) {
  if (m) {
    this.message = this.message + ': ' + m;
  }
}
exports.NotImplemented = NotImplemented;

NotImplemented.prototype = util.clone(Error.prototype);
NotImplemented.prototype.constructor = NotImplemented;
NotImplemented.prototype.message = NotImplemented.name;

function Compiler(parser) {
  this.parser = parser;
  this.output = new stream.WritableStream();
  this._compile = util.bind(this._compile, this);
}
exports.Compiler = Compiler;

Compiler.prototype.compile = function () {
  var ast;
  while ((ast = this.parser.parse()) !== lexer.EOF) {
    this.output.append(this._compile(ast) + ';');
  }
  return new stream.Stream(this.output.data);
};

Compiler.prototype._compile = function (ast) {
  var type = util.type(ast);
  switch (type) {
    case '[object Object]':
      if (datum.isList(ast)) {
        return this.compileList(ast);
      } else if (ast instanceof datum.Cons) {
        return this.compileCons(ast);
      } else if (ast instanceof datum.Symbol) {
        return this.compileSymbol(ast);
      }
      return this.compileObject(ast);

    case '[object String]':
      return this.compileString(ast);

    case '[object Number]':
      return this.compileNumber(ast);

    case '[object Null]':
      return 'null';

    default:
      throw new NotImplemented(type);
  }
};

Compiler.prototype.compileList = function (ls) {
  var fn = datum.head(ls);
  var args = datum.tail(ls);
  return this._compile(fn) + '(' +
    datum.join(datum.map(this._compile, args), ', ') + ')';
};

Compiler.prototype.compileSymbol = function (sym) {
  return sym.escapedName();
};

Compiler.prototype.compileCons = function (cons) {
  return 'new Cons(' +
    datum.join(
      datum.map(this._compile, [cons.left, cons.right]),
      ', ') + ')';
};

Compiler.prototype.compileObject = function () {
  throw new NotImplemented('Object');
};

Compiler.prototype.compileString = function () {
  throw new NotImplemented('String');
};

Compiler.prototype.compileNumber = function (n) {
  return '' + n;
};

exports.compile = function (stream) {
  var compiler = new Compiler(
    reader.makeParser(
      lexer.makeLexer(stream)));
  return compiler.compile();
};

exports.compileString = function (string) {
  return exports.compile(new stream.Stream(string));
};
