
var datum = require('../datum'),
    util = require('../util');

function Iterable(iter, options) {
  this.options = options || {};

  if (iter instanceof Iterable) {
    this.iter = iter.iter;
  } else {
    this.iter = iter;
  }

  var t;
  if (datum.isList(this.iter)) {
    this._setUpList();
  } else if (util.typeIsArrayLike(t = util.type(iter))) {
    this._setUpArray();
  } else if (t === '[object Object]') {
    if (!('keys' in this.options)) {
      this.options.keys = true;
    }
    this._setUpObject();
  } else if (t === '[object String]') {
    this._setUpString();
  }
}
module.exports = Iterable;

Iterable.prototype.complete = function () {
  return {value: undefined, done: true};
};

Iterable.prototype.next = Iterable.prototype.complete;

if (util.hasGenerators()) {
  require('./proto_harmony');
} else {
  require('./proto');
}
