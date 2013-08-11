
var repl = require('repl'),
    colors = require('colors'),
    fs = require('fs'),
    path = require('path'),
    lijsp = require('../lijsp'),
    lispEnv = require('../lisp/env');

exports.execute = function (args) {
  var lines = [];
  if (args.historyPersist) {
    try {
      lines = require(args.historyPersist);
    } catch (e) {}
  }
  lines.maxLength = args.historyLength;
  lines.truncate = function (line) {
    while (this.length >= this.maxLength) {
      this.shift();
    }
    return this;
  };
  lines.last = function () {
    return this[this.length - 1];
  };

  var setUpGlobals;
  var evalLine = function* () {
    var val, ast, result, stack, js;

    with (lispEnv) {
      while (1) {
        result = {};
        try {
          ast = lispEnv.read(lines.last());
          if (args.showAst) {
            // Don't set a property on result.
            console.log(require('util').inspect(ast, {
              colors: true,
              depth: 100
            }));
          } else {
            js = lispEnv.to_js(ast);
            if (args.showCode) {
              result.value = js;
            } else {
              result.value = eval(js);
              // The following method may provide a better stack trace,
              // but is unsuitable because local varables aren't preserved.
              // result.value = lispEnv.lisp_eval(ast);
            }
          }
        } catch (e) {
          stack = e && e.stack;
          if (stack) {
            console.error(stack);
          }
          result.error = e;
        }
        yield result;
      }
    }
  }();

  var lispRepl = repl.start({
    input: process.stdin,
    output: process.stdout,
    prompt: 'lijsp> '.yellow,
    eval: function (line, context, filename, callback) {
      line = line.substr(1, line.length - 2).trim();
      lines.push(line);
      var result = evalLine.next().value;
      if (result.error) {
        result.error = ('' + result.error).red;
      }
      callback(result.error, result.value);
    },
    // We always send lispRepl `undefined` when in showAst mode.
    ignoreUndefined: args.showAst
  });

  lispRepl.rli.history = lines;

  lispRepl.on('exit', function () {
    if (args.historyPersist) {
      fs.writeFileSync(args.historyPersist, JSON.stringify(
        lines.truncate()));
    }
    process.exit(0);
  });
};
