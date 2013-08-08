
var repl = require('repl'),
    colors = require('colors'),
    fs = require('fs'),
    lijsp = require('../lijsp');

exports.execute = function (args) {
  var lines = [];
  if (args.historyPersist) {
    try {
      lines = require(args.historyPersist);
    } catch (e) {}
  }
  lines.maxLength = args.historyLength;
  lines.addLine = function (line) {
    this.push(line);
    while (this.length >= this.maxLength) {
      this.shift();
    }
    return this;
  };
  lines.last = function () {
    return this[this.length - 1];
  };

  var evalLine = function* () {
    while (1) {
      try {
        var result = lijsp.compileString(lines.last());
        var val = args.showCode ? result.data : eval(result.data);
        yield {value: val};
      } catch (e) {
        yield {error: e};
      }
    }
  }();

  var lispRepl = repl.start({
    input: process.stdin,
    output: process.stdout,
    prompt: 'lijsp> '.yellow,
    eval: function (line, context, filename, callback) {
      line = line.substr(1, line.length - 2).trim();
      lines.addLine(line);
      var result = evalLine.next().value;
      callback(result.error, result.value);
    }
  });

  lispRepl.rli.history = lines;

  lispRepl.on('exit', function () {
    if (args.historyPersist) {
      fs.writeFileSync(args.historyPersist, JSON.stringify(lines));
    }
    process.exit(0);
  });
};
