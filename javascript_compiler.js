
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
  this.expander.compiler = this;
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
  ast = this.expander.expand(ast);
  compiled = this.expand(ast);
  if (compiled === ast) {
    throw new CompileError('Can\'t compile: ' + ast +
      ' [' + (ast && ast.constructor && ast.constructor.name) + ']');
  }
  return compiled;
};


exports.makeCompiler = function (parser) {
  var compiler = new Compiler(parser);

  var mappile = util.bind(datum.map, datum, compiler.compileAst);

  var joinpile = function (joiner, ast) {
    return datum.join(mappile(ast), joiner);
  };

  var commapile = util.bind(joinpile, null, ', ');

  var arglistpile = function (ast) {
    return '(' + commapile(ast) + ')';
  };

  compiler.addRule(expander.type('[object Number]'), function (n) {
    return '' + n;
  });

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

  var isQuotedTest = expander.test(function (s) {
    return s instanceof datum.Symbol &&
      (s.name === 'quote' || s.name === 'quasiquote');
  });

  var quotedComparator = datum.list(
    isQuotedTest, datum.symbol('$x'));

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
    datum.symbol('quote'),
    datum.symbol('$expr')), function (ast, expr) {
      if (datum.isList(expr)) {
        expr = datum.apply(datum.list, datum.symbol('list'), expr);
      } else if (expr instanceof datum.Symbol) {
        expr = datum.list(
          datum.symbol('symbol'),
          expr.name);
      }
      return compiler.compileAst(expr);
    });

  compiler.addRule(datum.list(
    datum.symbol('quasiquote'),
    datum.symbol('$expr')), function (ast, expr) {
      throw 'unimplemented';
    });

  compiler.addRule(datum.list(
    datum.symbol('unquote'),
    datum.symbol('$expr')), function (ast, expr) {
      throw 'unimplemented';
    });

  compiler.addRule(datum.list(
    datum.symbol('unquote-splicing'),
    datum.symbol('$expr')), function (ast, expr) {
      throw 'unimplemented';
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

  return compiler;
};
