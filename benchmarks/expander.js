
var expander = require('../expander'),
    datum = require('../datum'),
    lispGlobal = require('../lisp/global.lijsp.js');

exports.run = function () {
  var comparator1 = datum.list(datum.symbol('fang'), 1, 2, 3);
  var ast1a = datum.list(datum.symbol('fang'), 1, 1, 3);
  var ast1b = datum.list(datum.symbol('fang'), 1, 2, 3);
  var comparator2 = datum.list(
    datum.symbol('fung'), expander.toTemplateVariable(
      datum.symbol('$raunchy')));
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

  var compareSymbol = datum.symbol('a');
  var compareSymbolMatch = datum.symbol('a');
  var compareSymbolNoMatch = datum.symbol('b');
  this.add('expander.compare symbol match', function () {
    expander.compare(compareSymbol, compareSymbolMatch);
  });
  this.add('expander.compare symbol no match', function () {
    expander.compare(compareSymbol, compareSymbolNoMatch);
  });

  var compareNative = 1;
  var compareNativeMatch = 1;
  var compareNativeNoMatch = 4;
  this.add('expander.compare native match', function () {
    expander.compare(compareNative, compareNativeMatch);
  });
  this.add('expander.compare native no match', function () {
    expander.compare(compareNative, compareNativeNoMatch);
  });

  var compareType = 'asdf';
  var compareTypeMatch = 'asdf';
  var compareTypeNoMatch = {};
  this.add('expander.compare type match', function () {
    expander.compare(compareType, compareTypeMatch);
  });
  this.add('expander.compare type no match', function () {
    expander.compare(compareType, compareTypeNoMatch);
  });

  var compareList = datum.list(1);
  var compareListMatch = datum.list(1);
  var compareListNoMatch = datum.list('yo');
  this.add('expander.compare list match', function () {
    expander.compare(compareList, compareListMatch);
  });
  this.add('expander.compare list no match', function () {
    expander.compare(compareList, compareListNoMatch);
  });

  var expand1 = datum.list(datum.symbol('def'), datum.symbol('a'), 1);
  var expand2 = datum.list(Math.random(), Math.random(), Math.random());
  this.add('expander#expand', function () {
    lispGlobal.lisp_expander.expand(expand1);
  }).add('expander#expand not found', function () {
    lispGlobal.lisp_expander.expand(expand2);
  });
}
