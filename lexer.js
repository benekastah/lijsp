var util = require('./util'),
    datum = require('./datum');

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
exports.stringTokens = [];
var _defToken = function (tokens, name) {
  var patterns = util.slice(arguments, 2),
      tok,
      action;
  if (util.type(datum.last(patterns)) === '[object Function]') {
    action = patterns.pop();
  }
  tok = new Token(name, patterns);
  exports[name] = tok;
  tokens.push(action ? [tok, action] : tok);
  return tok;
};

var defToken = function () {
  var args = util.slice(arguments);
  args.unshift(exports.tokens);
  return _defToken.apply(this, args);
};

var defStringToken = function () {
  var args = util.slice(arguments);
  args.unshift(exports.stringTokens);
  return _defToken.apply(this, args);
};

defToken('OpenList', '(');
defToken('CloseList', ')');
defToken('Number', /\-?\d+(\.\d+)?/);

defToken('String', '"', function (match) {
  var lex = exports.makeStringLexer(this.input),
      string = '',
      result;
  while ((result = lex.lex()) && result.token !== exports.StringClose) {
    if (result.token === exports.EOF) {
      throw new Lexer.Error(this.input, 'Unexpected EOF');
    }
    string += result.matchText;
  }
  match.matchText = string;
  match.pos.end = result.pos.end;
  return match;
});

// Order matters here.
defStringToken('StringCloseEscaped', '\\"');
defStringToken('StringBody', /[^"]/);
defStringToken('StringClose', '"');

defToken('Quote', '\'');
defToken('QuasiQuote', '`');
defToken('Unquote', ',');
defToken('UnquoteSplicing', ',@');

defToken('Dot', '.', '·');

var symbolChars = '\\w\\-+\\|\$!@%\\^&\\*=:\\?\\/<>\\\\~\\.';
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
        action = datum.identity,
        match;

    if (util.type(tok) === '[object Array]') {
      action = tok[1];
      tok = tok[0];
    }

    match = tok.match(this.input);
    if (match) {
      return action.call(this, match);
    }
  }

  throw new Lexer.Error(this.input);
};

Lexer.Error = function (input, message) {
  this.input = input;
  this.input_p = input._p;
  this.message = 'Can\'t lex: "' + this.input.peek() + '"';
  if (message) {
    this.message += ': ' + message;
  }
};
util.inherits(Lexer.Error, Error);


exports.makeLexer = function (input) {
  return new Lexer(input, exports.tokens);
};

exports.makeStringLexer = function (input) {
  return new Lexer(input, exports.stringTokens);
};
