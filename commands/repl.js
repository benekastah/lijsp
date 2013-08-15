
var repl = require('repl'),
    colors = require('colors'),
    fs = require('fs'),
    path = require('path'),
    lijsp = require('../lijsp'),
    lispEnv = require('../lisp/env'),
    datum = require('../datum'),
    vm = require('vm');

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

  var evalLine = function (context, filename) {
    var val, ast, result, stack, js;

    result = {};
    try {
      var readJs = 'read(' + JSON.stringify(lines.last()) + ')';
      if (args.showAst) {
        if (args.showExpanded) {
          readJs = 'macroexpand(' + readJs + ')';
        }
        ast = vm.runInContext(readJs, context, filename);
        console.log(require('util').inspect(ast, {
          colors: true,
          depth: 100
        }));
        // Don't set a property on result.
      } else {
        js = vm.runInContext('to_js(' + readJs + ')', context, filename);
        if (args.showCode) {
          result.value = js;
        } else {
          result.value = vm.runInContext(js, context, filename);
        }
      }
    } catch (e) {
      stack = e && e.stack;
      if (stack) {
        console.error(stack);
      }
      result.error = e;
    }
    return result;
  };

  var lispRepl = repl.start({
    input: process.stdin,
    output: process.stdout,
    prompt: 'lijsp> '.yellow,
    eval: function (line, context, filename, callback) {
      line = line.substr(1, line.length - 2).trim();
      lines.push(line);
      var result = evalLine(context, filename);
      if (result.error) {
        result.error = ('' + result.error).red;
      }
      callback(result.error, result.value);
    },
    // We always send lispRepl `undefined` when in showAst mode.
    ignoreUndefined: args.showAst
  });

  // Required for def to work
  lispRepl.context.exports = {};

  // Populate lisp globals to repl context
  for (var prop in lispEnv) {
    lispRepl.context[prop] = lispEnv[prop];
  }

  lispRepl.rli.history = lines;

  lispRepl.on('exit', function () {
    if (args.historyPersist) {
      fs.writeFileSync(args.historyPersist, JSON.stringify(
        lines.truncate()));
    }
    process.exit(0);
  });
};
