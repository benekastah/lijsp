var lexer = require('./lexer'),
    util = require('./util');

var _slice = Array.prototype.slice,
    _type = Object.prototype.toString;

var _indexOf = Array.prototype.indexOf || function (x) {
  for (var i = 0, len = this.length; i < len; i++) {
    if (this[i] === x) {
      return i;
    }
  }
  return -1;
};

function Parser(lexer) {
  this.lexer = lexer;
}

Parser.prototype.parse = function (/* toks... */) {
  var sliceStart, arg0, options;
  arg0 = arguments[0];
  if (arg0 instanceof lexer.Token) {
    sliceStart = 0;
    options = {};
  } else {
    sliceStart = 1;
    options = arg0;
  }
  var toks = _slice.call(arguments, sliceStart),
      p = 0;

  if (options.ignore && _type.call(options.ignore) !== '[object Array]') {
    options.ignore = [options.ignore];
  }

  this.lexer.input.begin();
  while (tok = this.lexer.lex()) {

  }
  this.lexer.input.rollback();
};

Parser.prototype.getDatum = function () {
  return (
    this.getList() ||
    this.getSymbol() ||
    this.getNumber()
  );
};

Parser.prototype.getList = function () {
  this.lexer.input.begin();

};


exports.read = function (stream) {
  var toks = [],
      lex = lexer.makeLexer(stream);
  while (tok = lex.lex()) {
    toks.push(tok);
    if (tok.token.name === 'EOF') {
      break;
    }
  }
  return toks;
};

exports.readString = function (str) {
  return exports.read(new util.Stream(str));
}


