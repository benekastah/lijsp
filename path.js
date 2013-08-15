
var path = exports,
    util = require('./util');

path.sep = '/';
var re_sep = /\/+/g;

var getParts = function (p) {
  return p.split(path.sep);
};

var joinParts = function (p) {
  return p.join(path.sep);
};

path.join = function () {
  return joinParts(util.slice(arguments)).replace(re_sep, path.sep);
};

path.dirname = function (p) {
  var parts = getParts(p);
  parts.pop();
  return joinParts(parts);
};

path.basename = function (p) {
  var parts = getParts(p);
  return parts.pop();
};

path.relative = function (p1, p2) {
  var parts1 = getParts(p1),
      parts2 = getParts(p2),
      results = [],
      differentIdx = false,
      part1, part2;
  for (var i = 0, len = parts1.length; i < len; i++) {
    part1 = parts1[i];
    part2 = parts2[i];
    if (differentIdx !== false || part1 !== part2) {
      if (differentIdx === false) {
        differentIdx = i;
      }
      results.push('..');
    }
  }
  results = results.concat(parts2.slice(differentIdx));
  return joinParts(results);
};
