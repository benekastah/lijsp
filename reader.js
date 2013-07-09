var lexer = require('./lexer'),
    util = require('./util'),
    stream = require('./stream'),
    datum = require('./datum'),
    undefined;

function ParseError(message) {
  if (message) {
    this.message = this.message + ': ' + message;
  }
}
util.inherits(ParseError, Error);
ParseError.prototype.message = ParseError.name;

function Parser(lex) {
  this.lexer = lex;
  this.actions = {};
  this.ignoreTokens = [];
  this.endResult;
  this.endAction = '__END__';
  this.end([lexer.EOF, function (eof) {
    return eof.token;
  }]);
}
exports.Parser = Parser;

Parser.prototype.parse = function () {
  if (this.endResult !== undefined ||
      (this.endResult = this.tryParseAction(this.endAction)) !== undefined) {
    return this.endResult;
  }
  return this.parseAction(this.startAction);
};

Parser.prototype.tryParseAction = function (name) {
  try {
    return this.parseAction(name);
  } catch (e) {
    if (e instanceof ParseError) {
      return undefined;
    } else {
      throw e;
    }
  }
};

Parser.prototype.parseAction = function (name) {
  var action = this.actions[name],
      result;
  for (var i = 0, len = action.length; i < len; i++) {
    var item, set, callback;
    item = util.asArray(action[i]);
    set = util.asArray(item[0]);
    callback = item[1];
    result = this.parseSet(set);
    if (result !== undefined) {
      result = {
        action: name,
        set: set,
        match: result,
        inputPointer: this.lexer.input.getPointer(),
        callback: callback
      };
      result.result = result.callback ?
        result.callback.apply(result, result.match) :
        result.match[0];
      return result.result;
    }
  }
  throw new ParseError(name);
};

Parser.prototype.parseSet = function (set) {
  var results = [],
      tok, match, matched;

  // Operate within a transaction using the Stream's api
  this.lexer.input.begin();
  for (var i = 0, len = set.length; i < len; i++) {
    matched = false;
    tok = set[i];

    if (util.type(tok) === '[object String]') {
      var result = this.tryParseAction(tok);
      if (result !== undefined) {
        matched = true;
        results.push(result);
      }
    } else {
      match = this.lexer.lex();
      if (util.contains(this.ignoreTokens, match.token)) {
        i -= 1;
        continue;
      } if (tok && match.token === tok) {
        matched = true;
        results.push(match);
      }
    }

    if (!matched) {
      break;
    }
  }

  if (matched) {
    this.lexer.input.commit();
    return results;
  } else {
    this.lexer.input.rollback();
    return undefined;
  }
};

Parser.prototype.action = function (name/*, actions */) {
  this.actions[name] = util.slice(arguments, 1);
  return this;
};

Parser.prototype.start = function (name) {
  this.startAction = name;
  return this;
};

Parser.prototype.end = function () {
  this.action.apply(this, [this.endAction].concat(util.slice(arguments)));
};

Parser.prototype.ignore = function (/* tokens */) {
  this.ignoreTokens = this.ignoreTokens.concat(util.slice(arguments));
  return this;
};

exports.makeParser = function (lex) {
  return new Parser(lex).
    ignore(lexer.Whitespace).
    action('List', [
      [lexer.OpenList, lexer.CloseList], function () {
        return null;
      }
    ], [
      [lexer.OpenList, 'ExpressionList', lexer.CloseList], function () {
        return arguments[1];
      }
    ]).
    action('ExpressionList', [
      ['Expression', 'ExpressionList'], function (exp, items) {
        return new datum.Cons(exp, items);
      }
    ], [
      'Expression', function (exp) {
        return new datum.Cons(exp);
      }
    ]).
    action('Cons', [
      [lexer.OpenList, 'Expression', lexer.Dot, 'Expression', lexer.CloseList],
      function (a, left, b, right, c) {
        return new datum.Cons(left, right);
      }
    ]).
    action('Expression',
      [lexer.Symbol, function (s) { return new datum.Symbol(s.matchText); }],
      [lexer.Number, function (n) { return +n.matchText; }],
      'Cons',
      'List').
    start('Expression');
};


exports.read = function (stream) {
  var lex = lexer.makeLexer(stream),
      parser = exports.makeParser(lex);
  return parser.parse();
};

exports.readString = function (str) {
  return exports.read(new stream.Stream(str));
};

