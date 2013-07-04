
var assert = require('assert'),
    datum = require('../datum');

describe('Symbol', function () {
  describe('#escapedName', function () {
    it('should be able to produce a valid javascript identifier', function () {
      var s = new datum.Symbol('+');
      assert.equal('_$1b$_', s.escapedName());
    });

    it('should be able to handle two invalid chars in a row', function () {
      var s = new datum.Symbol('+-');
      assert.equal('_$1b$__$1d$_', s.escapedName());
    });

    it('should be able to handle invalid characters among valid characters', function () {
      var s = new datum.Symbol('my-thing?');
      assert.equal('my_$1d$_thing_$1v$_', s.escapedName());
    });

    it('should be able to handle leading digits', function () {
      var s = new datum.Symbol('55');
      assert.equal('_$1l$_5', s.escapedName());
    });
  });
});

describe('list', function () {
  it('should be able to build a list from its arguments', function () {
    var ls = datum.list(1, 2, 3);
    assert.ok(ls);
    var node = ls;
    for (var expected = 1; node; expected++) {
      assert.equal(expected, node.left);
      node = node.right;
    }
  });
});

describe('isList', function () {
  it('should be able to determine if an object is a list', function () {
    assert.ok(datum.isList(new datum.Cons(1)), 'a cons cell with a null right value is a list');
    assert.ok(datum.isList(datum.list(1, 2, 3, 4, 5)), 'a list built with `list` is a list');
    assert.ok(!datum.isList(new datum.Cons(1, 2)), 'an ordinary cons cell is not a list');
    assert.ok(!datum.isList(null), 'null values aren\'t lists');
    assert.ok(!datum.isList([]), 'arrays aren\'t lists');
  });
});

describe('length', function () {
  it('should be able to determine the length of a list', function () {
    var ls = new datum.Cons(1, new datum.Cons(2, new datum.Cons(3)));
    assert.equal(3, datum.length(ls));
  });

  it('should be able to determine the length of an array or array-like object', function () {
    var a = [1, 2, 3, 4];
    assert.equal(4, datum.length(a));
    (function () {
      assert.equal(4, datum.length(arguments));
    })(1, 2, 3, 4);
  });
});

describe('first', function () {
  it('should be the same as head', function () {
    assert.equal(datum.first, datum.head);
  });

  it('should get the first item from a list', function () {
    var ls = datum.list(1, 2, 3, 4);
    assert.equal(1, datum.first(ls));
  });

  it('should get the first item from an array', function () {
    var a = [1, 2, 3, 4];
    assert.equal(1, datum.first(a));
  });

  it('should get the first item from an array-like object', function () {
    (function () {
      assert.equal(1, datum.first(arguments));
    })(1, 2, 3, 4);
  });
});

describe('last', function () {
  it('should get the last item from a list', function () {
    var ls = datum.list(1, 2, 3, 4);
    assert.equal(4, datum.last(ls));
  });

  it('should get the last item from an array', function () {
    var a = [1, 2, 3, 4];
    assert.equal(4, datum.last(a));
  });

  it('should get the last item from an array-like object', function () {
    (function () {
      assert.equal(4, datum.last(arguments));
    })(1, 2, 3, 4);
  });
});

describe('tail', function () {
  it('should get the tail of a list', function () {
    var ls = datum.list(1, 2, 3, 4);
    assert.equal(ls.right, datum.tail(ls));
  });

  var testArr = function (a) {
    var tl = datum.tail(a);
    assert.equal(3, tl.length);
    assert.equal(2, tl[0]);
    assert.equal(3, tl[1]);
    assert.equal(4, tl[2]);
  };

  it('should get the tail of an array', function () {
    var a = [1, 2, 3, 4];
    testArr(a);
  });

  it('should get the tail of an array-like object', function () {
    (function () {
      testArr(arguments);
    })(1, 2, 3, 4);
  });
});

describe('init', function () {
  it('should get the init of a list', function () {
    var ls = datum.list(1, 2, 3, 4);
    var it = datum.init(ls);
    assert.equal(3, datum.length(it));
    var node = it;
    assert.equal(1, node.left);
    node = node.right;
    assert.equal(2, node.left);
    node = node.right;
    assert.equal(3, node.left);
    node = node.right;
    assert.ok(!node);
  });

  var testArr = function (a) {
    var it = datum.init(a);
    assert.equal(3, it.length);
    assert.equal(1, it[0]);
    assert.equal(2, it[1]);
    assert.equal(3, it[2]);
  };

  it('should get the init of an array', function () {
    var a = [1, 2, 3, 4];
    testArr(a);
  });

  it('should get the init of an array-like object', function () {
    (function () {
      testArr(arguments);
    })(1, 2, 3, 4);
  });
});

describe('join', function () {
  var joinTest = function (ls) {
    assert.equal('asdf', datum.join(ls));
    assert.equal('a-s-d-f', datum.join(ls, '-'));
  };

  it('should be able to join the elements of a list into a string', function () {
    var ls = datum.list('a', 's', 'd', 'f');
    joinTest(ls);
  });

  it('should be able to join the elements of an array into a string', function () {
    var a = ['a', 's', 'd', 'f'];
    joinTest(a);
  });

  it('should be able to join the elements of an array-like object into a string', function () {
    (function () {
      joinTest(arguments);
    })('a', 's', 'd', 'f');
  });
});

describe('each', function () {
  var testEach = function (ls) {
    var i = 1;
    datum.each(function (n) {
      if (i === 3) {
        return false;
      }
      assert.equal(i, n);
      i += 1;
      return null;
    }, ls);
    assert.equal(3, i);
  };

  it('should be able to iterate over a list', function () {
    var ls = datum.list(1, 2, 3, 4);
    testEach(ls);
  });

  it('should be able to iterate over an array', function () {
    var a = [1, 2, 3, 4];
    testEach(a);
  });

  it('should be able to iterate over an array-like object', function () {
    (function () {
      testEach(arguments);
    })(1, 2, 3, 4);
  });
});

describe('map', function () {
  var plus1 = function (n) {
    return n + 1;
  };

  it('should be able to map over a list', function () {
    var ls = datum.list(1, 2, 3, 4);
    var mls = datum.map(plus1, ls);
    assert.ok(mls instanceof datum.Cons);
    assert.equal(4, datum.length(mls));
    var node = mls;
    assert.equal(2, node.left);
    node = node.right;
    assert.equal(3, node.left);
    node = node.right;
    assert.equal(4, node.left);
    node = node.right;
    assert.equal(5, node.left);
    node = node.right;
    assert.ok(!node);
  });

  var testArr = function (a) {
    var ma = datum.map(plus1, a);
    assert.equal(4, ma.length);
    assert.equal(2, ma[0]);
    assert.equal(3, ma[1]);
    assert.equal(4, ma[2]);
    assert.equal(5, ma[3]);
  };

  it('should be able to map over an array', function () {
    var a = [1, 2, 3, 4];
    testArr(a);
  });

  it('should be able to map over an array-like object', function () {
    (function () {
      testArr(arguments);
    })(1, 2, 3, 4);
  });
});

describe('filter', function () {

});

describe('reduce', function () {

});
