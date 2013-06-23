var _slice = Array.prototype.slice,
    _type = Object.prototype.toString;



function Token(name, patterns) {
  this.name = name;
  this.patterns = [];
  if (patterns) {
    for (var i = 0, len = patterns.length; i < len; i++) {
      this.addPattern(patterns[i]);
    }
  }
}
exports.Token = Token;

Token.prototype.addPattern = function (p) {
  var t = _type.call(p);
  if (t === '[object RegExp]') {
    var source = p.source.charAt(0) != '^' ?
        '^' + p.source : p.source;

    this.patterns.push(new RegExp(
      source, (p.ignoreCase ? 'i' : '') + (p.multiline ? 'm' : '')));
  } else if (t === '[object String]') {
    this.patterns.push(p);
  } else {
    throw 'Can\'t use "' + p + '" as a Token\'s pattern';
  }
};

Token.prototype.match = function (stream) {
  var match,
      matchText;
  for (var i = 0, len = this.patterns.length; i < len; i++) {
    var p = this.patterns[i],
        t = _type.call(p);

    if (t === '[object RegExp]') {
      match = stream.match(p);
      if (match) {
        matchText = match[0];
      }
    } else if (t === '[object String]') {
      matchText = stream.peek(p.length);
      if (matchText !== p) {
        matchText = null;
      }
    } else {
      throw 'Unimplemented';
    }

    if (matchText != null) {
      return new TokenMatch(this, matchText, stream.commit());
    }
  }
};


function TokenMatch(token, matchText, pos) {
  this.token = token;
  this.matchText = matchText;
  this.pos = pos;
}


var defToken = function (name) {
  var patterns = _slice.call(arguments, 1);
  return exports[name] = new Token(name, patterns);
};

defToken('OpenList', '(');
defToken('CloseList', ')');
defToken('Number', /\d+\.\d+/, /\d+/);

var beginSymbol = '\\w\\-+|!@%\\^&\\*=:\\?\\/<>\\.\\\\';
var endSymbol = beginSymbol + '\\d';
defToken('Symbol', new RegExp('[' + beginSymbol + '][' + endSymbol + ']*'));

defToken('Whitespace', /\s+/);

defToken('EOF');


function Lexer(stream, tokens) {
  this.input = stream;
  this.tokens = tokens;
}
exports.Lexer = Lexer;

Lexer.prototype.lex = function () {
  if (this.input.exhausted()) {
    return new TokenMatch(exports.EOF);
  }

  for (var i = 0, len = this.tokens.length; i < len; i++) {
    var tok = this.tokens[i],
        match;
    match = tok.match(this.input);
    if (match) {
      return match;
    }
  }
  throw 'Can\'t lex: "' + this.input.peek() + '"';
};


exports.makeLexer = function (input) {
  return new Lexer(input, [
    exports.Whitespace,
    exports.OpenList,
    exports.CloseList,
    exports.Number,
    exports.Symbol
  ]);
};