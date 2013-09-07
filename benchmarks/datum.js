
var datum = require('../datum');

exports.run = function () {
  this.add('list', function () {
    datum.list(1, 2, 3, 4, 5, 6, 7);
  });

  this.add('array', function () {
    [1, 2, 3, 4, 5, 6, 7];
  });

  var isList_list = datum.list(1, 2, 3, 4, 5, 6, 7);
  this.add('isList yes', function () {
    datum.isList(isList_list);
  });

  var isList_notList = datum.cons(1, 2);
  this.add('isList no', function () {
    datum.isList(isList_notList);
  });

  var each_list = datum.list(3, 2, 7, 6, 9, 0);
  this.add('each list', function () {
    datum.each(function () {}, each_list);
  });

  this.add('symbol', function () {
    datum.symbol('this_is_a_symbol');
  });

  var length_list = datum.list(1, 2, 3, 4, 5, 6, 7, 8);
  this.add('length', function () {
    datum.length(length_list);
  });
};
