var util = require('./util');

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

Token.InvalidPattern = function (p) {
  this.pattern = p;
  this.message = 'Can\'t use "' + this.pattern + '" as a Token\'s pattern';
};

Token.InvalidPattern.prototype = util.clone(Error.prototype);
Token.InvalidPattern.prototype.constructor = Token.InvalidPattern;

Token.prototype.addPattern = function (p) {
  var t = util.type(p);
  if (t === '[object RegExp]') {
    var source = p.source.charAt(0) != '^' ?
        '^' + p.source : p.source;

    this.patterns.push(new RegExp(
      source, (p.ignoreCase ? 'i' : '') + (p.multiline ? 'm' : '')));
  } else if (t === '[object String]') {
    this.patterns.push(p);
  } else {
    throw new Token.InvalidPattern(p);
  }
};

Token.prototype.match = function (input) {
  var match, reMatch, matchText;
  for (var i = 0, len = this.patterns.length; i < len; i++) {
    input.begin();
    var p = this.patterns[i],
        t = util.type(p);

    if (t === '[object RegExp]') {
      match = input.getRest().match(p);
      if (match) {
        reMatch = match;
        matchText = match[0];
        input.undo().movePointer(matchText.length);
      }
    } else if (t === '[object String]') {
      matchText = input.get(p.length);
      if (matchText !== p) {
        matchText = null;
      }
    } else {
      throw 'Unimplemented';
    }

    if (matchText != null) {
      return new TokenMatch(this, matchText, input.commit(), reMatch);
    } else {
      input.rollback();
    }
  }
};


function TokenMatch(token, matchText, pos, reMatch) {
  this.token = token;
  this.matchText = matchText;
  this.pos = pos;
  this.reMatch = reMatch;
}
exports.TokenMatch = TokenMatch;


exports.tokens = [];
var defToken = function (name) {
  var patterns = util.slice(arguments, 1),
      tok = new Token(name, patterns);
  exports[name] = tok;
  exports.tokens.push(tok);
  return tok;
};

defToken('OpenList', '(');
defToken('CloseList', ')');
defToken('Number', /\-?\d+(\.\d+)?/);

defToken('Quote', '\'');
defToken('QuasiQuote', '`');
defToken('Unquote', ',');
defToken('UnquoteSplicing', ',@');

defToken('Dot', '.', '·');

var symbolChars = '\\w\\-+\\|\$!@%\\^&\\*=:\\?\\/<>\\\\~';
defToken('JSOperator', new RegExp('@<\\s*([' + symbolChars + ']+)\\s*>'));
defToken('Symbol', new RegExp('[' + symbolChars + ']+'));

defToken('Whitespace', /\s+/);

defToken('EOF');


function Lexer(stream, tokens) {
  this.input = stream;
  this.tokens = tokens || [];
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

  throw new Lexer.Error(this.input);
};

Lexer.Error = function (input) {
  this.input = input;
  this.input_p = input._p;
  this.message = 'Can\'t lex: "' + this.input.peek() + '"';
};
util.inherits(Lexer.Error, Error);


exports.makeLexer = function (input) {
  return new Lexer(input, exports.tokens);
};
