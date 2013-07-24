
var assert = require('assert'),
    datum = require('../datum'),
    util = require('../util');

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

var Collection = datum.Collection;
describe('Collection', function () {
  describe('.mimicType', function () {
    it('should be able to mimic lists', function () {
      var result;
      var ls = datum.list(1, 2, 3);
      var coll = Collection.mimicType(ls);
      result = coll.value;
      assert.equal(undefined, result);
      assert.notEqual(ls, result);
      assert.equal(0, datum.length(result));

      coll.add(1);
      result = coll.value;
      assert.equal(datum.isList(ls), datum.isList(result));
      assert.equal(1, datum.length(result));
    });

    it('should be able to mimic arrays', function () {
      var a = [1, 2, 3];
      result = Collection.mimicType(a).value;
      assert.equal(util.type(a), util.type(result));
      assert.notEqual(a, result);
      assert.equal(0, result.length);
    });

    it('should be able to mimic objects', function () {
      var o = {a:1, b:2, c:3};
      result = Collection.mimicType(o).value;
      assert.equal(util.type(o), util.type(result));
      assert.notEqual(o, result);
      assert.equal(0, util.keys(result).length);
    });
  });

  describe('#add', function () {
    function testListyAdd(ls) {
      var coll = new Collection(ls);
      coll.add(2);
      coll.add(3);
      assert.equal(3, datum.length(coll.value));
      assert.equal(2, datum.nth(1, coll.value));
      assert.equal(3, datum.nth(2, coll.value));
    }

    function testObjectyAdd(o) {
      var coll = new Collection(o);
      coll.add('a', 1);
      coll.add('b', 2);
      coll.add(0, 3);
      assert.equal(1, coll.value.a);
      assert.equal(2, coll.value.b);
      assert.equal(3, coll.value[0]);
    }

    it('should be able to add items to lists', function () {
      testListyAdd(datum.list(1));
    });

    it('should be able to add items to arrays', function () {
      testListyAdd([1]);
    });

    it('should be able to add items to arrays by index', function () {
      testObjectyAdd([]);
    });

    it('should be able to add items to objects', function () {
      testObjectyAdd({});
    });
  });
});

describe('map', function () {
  var plus1 = function (n) {
    return n + 1;
  };

  var testList = function (ls) {
    var mls = datum.map(plus1, ls);
    assert.equal(4, datum.length(mls));
    assert.equal(2, datum.nth(0, mls));
    assert.equal(3, datum.nth(1, mls));
    assert.equal(4, datum.nth(2, mls));
    assert.equal(5, datum.nth(3, mls));
    return mls;
  };

  it('should be able to map over a list', function () {
    var mls = testList(datum.list(1, 2, 3, 4));
    assert.ok(mls instanceof datum.Cons);
  });

  it('should be able to map over an array', function () {
    var ma = testList([1, 2, 3, 4]);
    assert.ok(ma instanceof Array);
  });

  it('should be able to map over an array-like object', function () {
    (function () {
      var ma = testList(arguments);
      assert.ok(ma instanceof Array);
    })(1, 2, 3, 4);
  });
});

describe('concat', function () {
  var test = function (a, b, c) {
    var ls = datum.concat(a, b, c);
    assert.equal(1, datum.nth(0, ls));
    assert.equal(2, datum.nth(1, ls));
    assert.equal(3, datum.nth(2, ls));
    assert.equal(4, datum.nth(3, ls));
    assert.equal(5, datum.nth(4, ls));
    assert.equal(6, datum.nth(5, ls));
    assert.equal(6, datum.length(ls));
    return ls;
  };

  it('should be able to concatenate lists', function () {
    var ls = test(datum.list(1, 2), datum.list(3, 4), datum.list(5, 6));
    assert.ok(ls instanceof datum.Cons);
  });

  it('should be able to concatenate arrays', function () {
    var ls = test([1, 2], [3, 4], [5, 6]);
    assert.ok(ls instanceof Array);
  });

  it('should be able to concatenate arguments objects', function () {
    (function () {
      var a = arguments;
      (function () {
        var b = arguments;
        (function () {
          var c = arguments;
          var ls = test(a, b, c);
          assert.ok(ls instanceof Array);
        })(5, 6);
      })(3, 4);
    })(1, 2);
  });

  it('should be able to concatenate objects', function () {
    var obj = datum.concat({a: 1}, {b: 2, c: 3}, {c: 4});
    assert.equal(obj.a, 1);
    assert.equal(obj.b, 2);
    assert.equal(obj.c, 4);
    assert.equal(3, util.keys(obj).length);
  });

  it('should be able to concatenate strings', function () {
    var s = datum.concat('asdf', 'fdsa', 'gzip');
    assert.equal(s, 'asdffdsagzip');
  });
});

describe('filter', function () {

});

describe('reduce', function () {

});

describe('reverse', function () {
  var testReverse = function (ls) {
    var rls = datum.reverse(ls);
    assert.equal(datum.nth(0, ls), datum.nth(3, rls));
    assert.equal(datum.nth(1, ls), datum.nth(2, rls));
    assert.equal(datum.nth(2, ls), datum.nth(1, rls));
    assert.equal(datum.nth(3, ls), datum.nth(0, rls));
  };

  it('should reverse a list', function () {
    testReverse(datum.list(1, 2, 3, 4));
  });

  it('should reverse an array', function () {
    testReverse([1, 2, 3, 4]);
  });

  it('should reverse an array-like object', function () {
    (function () {
      testReverse(arguments);
    })(1, 2, 3, 4);
  });
});

describe('nth', function () {
  it('should get nth item from a list', function () {
    var ls = datum.list(1, 2, 3);
    assert.equal(2, datum.nth(1, ls));
  });

  it('should get nth item from an array', function () {
    var a = [1, 2, 3];
    assert.equal(2, datum.nth(1, a));
  });

  it('should get nth item from an array-like object', function () {
    (function () {
      assert.equal(2, datum.nth(1, arguments));
    })(1, 2, 3);
  });
});
