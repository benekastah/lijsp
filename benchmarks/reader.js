
var reader = require('../reader');

exports.run = function () {
  var parserNumber = reader.makeParser('1');
  var parserString = reader.makeParser('"this is a string, bitch"');
  var parserList = reader.makeParser('(1 2 3 4 5 6)');

  this.add('Parser#parse number', function () {
    parserNumber.parse();
  });

  this.add('Parser#parse string', function () {
    parserString.parse();
  });

  this.add('Parser#parse list', function () {
    parserList.parse();
  });
};
