
var expander = require('../expander'),
    datum = require('../datum'),
    lispGlobal = require('../lisp/global.lijsp.js');

exports.run = function () {
  var comparator1 = datum.list(datum.symbol('fang'), 1, 2, 3);
  var ast1a = datum.list(datum.symbol('fang'), 1, 1, 3);
  var ast1b = datum.list(datum.symbol('fang'), 1, 2, 3);
  var comparator2 = datum.list(datum.symbol('fung'), datum.symbol('$raunchy'));
  var ast2a = datum.list(datum.symbol('thing'));
  var ast2b = datum.list(datum.symbol('fung'), 5);

  this.add('expander.compare 1a', function () {
    expander.compare(comparator1, ast1a);
  }).add('expander.compare 1b', function () {
    expander.compare(comparator1, ast1b);
  }).add('expander.compare 2a', function () {
    expander.compare(comparator2, ast2a);
  }).add('expander.compare 2b', function () {
    expander.compare(comparator2, ast2b);
  });

  var expand1 = datum.list(datum.symbol('def'), datum.symbol('a'), 1);
  var expand2 = datum.list(Math.random(), Math.random(), Math.random());
  this.add('expander#expand', function () {
    lispGlobal.lisp_expander.expand(expand1);
  }).add('expander#expand not found', function () {
    lispGlobal.lisp_expander.expand(expand2);
  });
}
