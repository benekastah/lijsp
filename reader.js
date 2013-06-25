var lexer = require('./lexer'),
    util = require('./util'),
    datum = require('./datum');

function Parser(lexer) {
  this.lexer = lexer;
}
exports.Parser = Parser;

Parser.prototype.defaultOptions = {
  ignore: [lexer.Whitespace]
};

Parser.prototype.parse = function () {
  var sliceStart, options;
  if (util.type(arguments[0]) !== '[object Object]') {
    sliceStart = 0;
  } else {
    sliceStart = 1;
    options = arguments[0];
  }

  var tokSets = util.slice(arguments, sliceStart),
      results = [];

  if (!options) {
    options = util.clone(this.defaultOptions);
  }

  if (options.ignore && util.type(options.ignore) !== '[object Array]') {
    options.ignore = util.asArray(options.ignore);
  }

  var result;
  for (var i = 0, len = tokSets.length; i < len; i++) {
    this.lexer.input.begin();
    var set = util.asArray(tokSets[i]);
    result = this.parseSet(options, set);
    if (result) {
      results.push({
        set: set,
        match: result,
        inputPointer: this.lexer.input.getPointer()
      });
    }
    this.lexer.input.rollback();
  }

  if (results.length < 1) {
    return null;
  } else if (results.length > 1) {
    throw new Parser.Conflict(results);
  }

  result = results[0];
  this.lexer.input.setPointer(result.inputPointer);
  return result;
};

Parser.prototype.parseSet = function (options, set) {
  var results = [],
      token_i = -1,
      tok, matched;

  // Operate within a transaction using the Stream's api
  this.lexer.input.begin();
  while (match = this.lexer.lex()) {
    if (options.ignore && util.contains(options.ignore, match.token)) {
      // ignore this token
      continue;
    }

    matched = false;
    token_i += 1;
    tok = set[token_i];

    if (util.type(tok) === '[object Function]') {
      // Undo last read so it will be passed on to the next parser function.
      this.lexer.input.undo();
      var parse = tok;
      var result = parse.call(this);
      if (result) {
        matched = true;
        results.push(result);
      }
    } else if (tok && match.token === tok) {
      matched = true;
      results.push(match);
    }

    if (matched) {
      // If we have parsed the last token in this set successfully,
      // return the result.
      if (token_i === set.length - 1) {
        this.lexer.input.commit();
        return results;
      }
    } else {
      break;
    }
  }
  this.lexer.input.rollback();
  return null;
};

Parser.prototype.parseDatum = function () {
  return this.Expression();
};

Parser.prototype.List = function () {
  return this.parse(
    [lexer.OpenList, lexer.CloseList],
    [lexer.OpenList, this.ListItems, lexer.CloseList]);
};

Parser.prototype.ListItems = function () {
  return this.parse(
    this.Expression,
    [this.ListItems, this.Expression]);
};

Parser.prototype.Expression = function () {
  return this.parse(
    lexer.Symbol,
    lexer.Number,
    this.List)[0];
};


Parser.Conflict = function (results) {
  this.results = results;
  this.message = 'Multiple valid paths for parser: ';
  for (var i = 0, len = this.results.length; i < len; i++) {
    var result = this.results[i];
    this.message += result.set;
  }
};

Parser.Conflict.prototype = util.clone(Error.prototype);
Parser.Conflict.prototype.constructor = Parser.Conflict;


exports.read = function (stream) {
  var toks = [],
      lex = lexer.makeLexer(stream),
      parser = new Parser(lex);
  return parser.parseDatum();
};

exports.readString = function (str) {
  return exports.read(new util.Stream(str));
}


