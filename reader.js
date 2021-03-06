var lexer = require('./lexer'),
    util = require('./util'),
    stream = require('./stream'),
    datum = require('./datum'),
    undefined;

function ParseError(message) {
  ParseError.super_.call(message);
}
util.inherits(ParseError, util.AbstractError);

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

Parser.prototype.parseAll = function () {
  var results = datum.list(),
      ast;
  while ((ast = this.parse()) !== lexer.EOF) {
    results = datum.cons(ast, results);
  }
  if (datum.length(results) > 1) {
    return datum.cons(datum.symbol('statements'), results);
  } else {
    return datum.first(results);
  }
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

var jsOperators = [
  // Assignment
  '=', '+=', '-=', '*=', '/=', '%=',
  '<<=', '>>=', '>>>=', '&=', '^=', '|=',

  // Arithmetic
  '+', '-', '*', '/', '%', '++', '--',

  // Bitwise
  '&', '|', '^', '<<', '>>', '>>>', '~',

  // Comparison
  '==', '===', '!=', '!==', '<', '>', '<=', '>=',

  // Logical
  '&&', '||', '!',

  // Special
  ',', 'delete', 'in', 'instanceof', 'new', 'typeof'
];
exports.makeParser = function (lex) {
  if (util.type(lex) === '[object String]') {
    lex = new stream.Stream(lex);
  }

  if (lex instanceof stream.Stream) {
    lex = lexer.makeLexer(lex);
  }

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
    action('Quote', [
      [lexer.Quote, 'Expression'], function (__, expr) {
        return datum.list(datum.symbol('quote'), expr);
      }
    ], [
      [lexer.QuasiQuote, 'Expression'], function (__, expr) {
        return datum.list(datum.symbol('quasiquote'), expr);
      }
    ], [
      [lexer.Unquote, 'Expression'], function (__, expr) {
        return datum.list(datum.symbol('unquote'), expr);
      }
    ], [
      [lexer.UnquoteSplicing, 'Expression'], function (__, expr) {
        return datum.list(datum.symbol('unquote-splicing'), expr);
      }
    ]).
    action('Operator', [lexer.JSOperator, function (op) {
      var opText = op.reMatch[1];
      if (util.contains(jsOperators, opText)) {
        return new datum.Operator(opText);
      } else if (opText === '?:') {
        return new datum.TernaryOperator();
      } else if (opText === 'void') {
        return new datum.VoidOperator();
      } else if (opText === 'this') {
        return new datum.ThisOperator();
      } else if (opText === 'var') {
        return new datum.VarOperator();
      } else if (opText === 'function') {
        return new datum.FunctionOperator();
      } else if (opText === 'return') {
        return new datum.ReturnOperator();
      } else if (opText === '.') {
        return new datum.PropertyAccessOperator();
      } else if (opText === 'for') {
        return new datum.ForOperator();
      } else if (opText === 'try') {
        return new datum.TryOperator();
      } else if (opText === 'catch') {
        return new datum.CatchOperator();
      } else {
        throw 'Unrecognized operator: ' + op.matchText;
      }
    }]).
    action('Expression',
      'Operator',
      [lexer.Symbol, function (s) {
        switch (s.matchText) {
          case 'nil': return null;
          case '#t': return true;
          case '#f': return false;
          default: return new datum.Symbol(s.matchText);
        }
      }],
      [lexer.Number, function (n) { return +n.matchText; }],
      [lexer.String, function (s) { return s.matchText; }],
      [lexer.JSCode, function (js) {
        return new datum.JavaScriptCode(js.reMatch[1]);
      }],
      'Cons',
      'List',
      'Quote').
    start('Expression');
};


exports.read = function (lex) {
  var parser = exports.makeParser(lex);
  return parser.parse();
};

