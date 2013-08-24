
var stream = require('./stream'),
    util = require('./util'),
    datum = require('./datum'),
    lexer = require('./lexer'),
    reader = require('./reader'),
    expander = require('./expander'),
    undefined;

function CompileError(compiler, ast) {
  var m = 'Can\'t compile ' + util.inspect(ast) +
    ' in ' + compiler.opts.currentFile;
  CompileError.super_.call(this, m);
}
exports.CompileError = CompileError;
util.inherits(CompileError, util.AbstractError);
CompileError.prototype.message = CompileError.name;

function Compiler(parser, opts) {
  Compiler.super_.call(this);
  // Since all compiler rules produce strings and strings are also valid
  // input for a compiler rule, prevent expanding previously expanded
  // values.
  this.expandExpanded = false;

  this.opts = opts || {};
  this.parser = parser;
  this.expander = this.opts.expander || expander.makeExpander();
  this.output = new stream.WritableStream();
  this.compileAst = util.bind(this.compileAst, this);
}
exports.Compiler = Compiler;
util.inherits(Compiler, expander.Expander);

Compiler.prototype.compile = function () {
  var ast;
  while ((ast = this.parser.parse()) !== lexer.EOF) {
    this.output.append(this.compileStatement(ast));
  }
  return new stream.Stream(this.output.data);
};

Compiler.prototype.compileStatement = function (ast) {
  return this.compileAst(ast) + ';';
};

Compiler.prototype.compileAst = function (ast) {
  ast = this.expander.expand(ast, this);
  compiled = this.expand(ast);
  if (compiled === ast) {
    throw new CompileError(this, ast);
  }
  return compiled;
};


exports.makeCompiler = function (parser, opts) {
  var compiler = new Compiler(parser, opts);

  var mappile = util.bind(datum.map, datum, compiler.compileAst);

  var joinpile = function (joiner, ast) {
    return datum.join(mappile(ast), joiner);
  };

  var commapile = util.bind(joinpile, null, ', ');

  var arglistpile = function (ast) {
    return '(' + commapile(ast) + ')';
  };

  compiler.addRule(expander.type(datum.JavaScriptCode), function (js) {
    return js.code;
  });

  compiler.addRule(expander.type('[object Number]'), function (n) {
    return '' + n;
  });

  compiler.addRule(datum.list(
    expander.type(datum.Quote),
    datum.symbol('$expr')), function (ast, expr) {
      if (datum.isList(expr)) {
        expr = datum.apply(
          datum.list,
          datum.symbol('list'),
          expr);
      } else if (expr instanceof datum.Symbol) {
        expr = datum.list(
          datum.symbol('symbol'),
          expr.name);
      } else if (expr instanceof datum.Operator) {
        expr = datum.list(
          new datum.Operator('new'),
          datum.list(
            datum.symbol('Operator'),
            expr.name));
      }

      for (var i = 0, len = datum.specialOperators.length; i < len; i++) {
        var SpecialOperator = datum.specialOperators[i];
        if (expr instanceof SpecialOperator) {
          expr = datum.list(
            new datum.Operator('new'),
            datum.list(
              datum.symbol(SpecialOperator.name)));
          break;
        }
      }

      return compiler.compileAst(expr);
    });

  // All operators should go after the quote stuff
  compiler.addRule(expander.type(datum.ThisOperator), function (ast) {
    return 'this';
  });

  var compileVarItem = function (x) {
    if (x instanceof datum.Symbol) {
      return compiler.compileAst(x);
    } else if (datum.isList(x)) {
      return joinpile(' = ', x);
    }
  };

  compiler.addRule(datum.list(
    expander.type(datum.VarOperator),
    datum.symbol('$x'),
    datum.symbol('$$rest')), function (ast, x, rest) {
      var args = datum.tail(ast);
      return 'var ' + datum.join(datum.map(compileVarItem, args), ', ');
    });

  compiler.addRule(expander.type(datum.VoidOperator), function () {
    return 'void(0)';
  });

  compiler.addRule(datum.list(
    expander.type(datum.TernaryOperator),
    datum.symbol('$condition'),
    datum.symbol('$t'),
    datum.symbol('$f')), function (ast, condition, t, f) {
    return '(' + compiler.compileAst(condition) +
      ' ? ' + compiler.compileAst(t) +
      ' : ' + compiler.compileAst(f) + ')';
  });

  compiler.addRule(datum.list(
    expander.type(datum.FunctionOperator),
    datum.symbol('$a'),
    datum.symbol('$$rest')),
    function (ast, a, rest) {
      var c_name, args, body, c_body, open, close;
      open = '';
      close = '';
      if (rest.right) {
        c_name = compiler.compileAst(a);
        args = rest.left;
        body = rest.right.left;
      } else {
        c_name = '';
        open = '(';
        close = ')';
        args = a;
        body = rest.left;
      }
      c_body = joinpile(';', body);
      if (c_body) {
        c_body += ';';
      }
      return open + 'function ' + c_name + arglistpile(args) + ' { ' +
        c_body + ' }' + close;
    });

  compiler.addRule(datum.list(
    expander.type(datum.ForOperator),
    datum.symbol('$setup'),
    datum.symbol('$$body')), function (ast, setup, body) {
      var statementize = function (x) {
        return datum.list(datum.symbol('statements'), x);
      };
      return 'for (' + compiler.compileAst(statementize(setup)) + ') {' +
          compiler.compileAst(statementize(body)) +
        '}';
    });

  compiler.addRule(datum.list(
    expander.type(datum.Operator),
    datum.symbol('$a'),
    datum.symbol('$b'),
    datum.symbol('$$rest')), function (ast, a, b, rest) {
      var op = ast.left;
      args = new datum.Cons(b, rest);
      args = new datum.Cons(a, args);
      return '(' + joinpile(' ' + op.name + ' ', args) + ')';
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
    expander.type(datum.ReturnOperator),
    datum.symbol('$x')), function (ast, x) {
      return 'return ' + compiler.compileAst(x);
    });

  var quotedComparator = datum.list(
    expander.type(datum.Quote), datum.symbol('$x'));

  compiler.addRule(datum.list(
    expander.type(datum.PropertyAccessOperator),
    datum.symbol('$base'),
    datum.symbol('$$rest')), function (ast, base, rest) {
      var parts = [compiler.compileAst(base)];
      datum.each(function (prop) {
        var match = expander.compare(quotedComparator, prop);
        if (match) {
          parts.push('.' + match[1].escapedName());
        } else {
          parts.push('[' + compiler.compileAst(prop) + ']');
        }
      }, rest);
      return parts.join('');
    });

  compiler.addRule(expander.type(datum.Symbol), function (sym) {
    return sym.escapedName();
  });

  var re_singleQuotes = /'/g;
  compiler.addRule(expander.type('string'), function (str) {
    return '\'' + str.replace(re_singleQuotes, '\\\'') + '\'';
  });

  compiler.addRule(datum.list(
    datum.symbol('statements'),
    datum.symbol('$$statements')), function (ast, statements) {
      var results = datum.map(function (statement) {
        return compiler.compileStatement(statement);
      }, statements);
      return datum.reduce(function (a, b) {
        return a + b;
      }, '', results);
    });

  // This is a catch-all for any list patterns, so it should be the
  // last list pattern.
  compiler.addRule(datum.list(
    datum.symbol('$fn'), datum.symbol('$$args')), function (ls, fn, args) {
    return compiler.compileAst(fn) + arglistpile(args);
  });

  compiler.addRule(expander.type(datum.Cons), function (cons) {
    return 'cons' + arglistpile([cons.left, cons.right]);
  });

  compiler.addRule(null, function () {
    return 'null';
  });

  compiler.addRule(undefined, function () {
    return 'void(0)';
  });

  return compiler;
};
