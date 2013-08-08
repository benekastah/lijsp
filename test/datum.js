
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

describe('identity', function () {
  it('should return the first argument passed in', function () {
    assert.equal(5, datum.identity(5));
    assert.equal('asdf', datum.identity('asdf', 1, 2,3));
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

  it('should return null with zero arguments', function () {
    var ls = datum.list();
    assert.equal(null, ls);
  });
});

describe('apply', function () {
  var fn = function () {
    return util.slice(arguments);
  };

  var test = function () {
    var args = util.slice(arguments);
    args.unshift(fn);
    var result = datum.apply.apply(null, args);
    assert.equal(4, result.length);
    assert.equal(1, result[0]);
    assert.equal(2, result[1]);
    assert.equal(3, result[2]);
    assert.equal(4, result[3]);
  };

  it('should be able to build a function call', function () {
    test(1, 2, [3, 4]);
    test(1, 2, datum.list(3, 4));
    test([1, 2, 3, 4]);
    test(datum.list(1, 2, 3, 4));
  });
});

describe('isList', function () {
  it('should be able to determine if an object is a list', function () {
    assert.ok(datum.isList(new datum.Cons(1)), 'a cons cell with a null right value is a list');
    assert.ok(datum.isList(datum.list(1, 2, 3, 4, 5)), 'a list built with `list` is a list');
    assert.ok(datum.isList(null), 'null values are empty lists');
    assert.ok(!datum.isList(new datum.Cons(1, 2)), 'an ordinary cons cell is not a list');
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
    assert.equal(undefined, datum.first(null));
  });

  it('should get the first item from an array', function () {
    var a = [1, 2, 3, 4];
    assert.equal(1, datum.first(a));
    assert.equal(undefined, datum.first([]));
  });

  it('should get the first item from an array-like object', function () {
    (function () {
      assert.equal(1, datum.first(arguments));
    })(1, 2, 3, 4);
    (function () {
      assert.equal(undefined, datum.first(arguments));
    })();
  });

  it('should get the first item from a pair', function () {
    var cons = datum.cons('asdfzz', 6);
    assert.equal('asdfzz', datum.first(cons));
  });
});

describe('second', function () {
  it('should get the second item from a list', function () {
    var ls = datum.list(1, 2, 3, 4);
    assert.equal(2, datum.second(ls));
    assert.equal(undefined, datum.second(null));
  });

  it('should get the second item from an array', function () {
    var a = [1, 2, 3, 4];
    assert.equal(2, datum.second(a));
    assert.equal(undefined, datum.second([1]));
  });

  it('should get the second item from an array-like object', function () {
    (function () {
      assert.equal(2, datum.second(arguments));
    })(1, 2, 3, 4);
    (function () {
      assert.equal(undefined, datum.second(arguments));
    })(1);
  });

  it('should get the second item from a pair', function () {
    var cons = datum.cons(1, 55);
    assert.equal(55, datum.second(cons));
  });
});

describe('last', function () {
  it('should get the last item from a list', function () {
    var ls = datum.list(1, 2, 3, 4);
    assert.equal(4, datum.last(ls));
    assert.equal(undefined, datum.last(null));
  });

  it('should get the last item from an array', function () {
    var a = [1, 2, 3, 4];
    assert.equal(4, datum.last(a));
    assert.equal(undefined, datum.last([]));
  });

  it('should get the last item from an array-like object', function () {
    (function () {
      assert.equal(4, datum.last(arguments));
    })(1, 2, 3, 4);
    (function () {
      assert.equal(undefined, datum.last(arguments));
    })();
  });

  it('should get the last item from a pair', function () {
    var cons = datum.cons(1, 3);
    assert.equal(3, datum.last(cons));
  });
});

describe('tail', function () {
  var testList = function (a) {
    var tl = datum.tail(a);
    assert.equal(3, datum.length(tl));
    assert.equal(2, datum.nth(0, tl));
    assert.equal(3, datum.nth(1, tl));
    assert.equal(4, datum.nth(2, tl));
  };

  var testSingleItemList = function (ls) {
    var it = datum.init(ls);
    assert.equal(0, datum.length(it));
  };

  var testEmptyList = function (ls) {
    var tl = datum.tail(ls);
    assert.equal(0, datum.length(tl));
    return tl;
  };

  it('should get the tail of a list', function () {
    var ls = datum.list(1, 2, 3, 4);
    assert.equal(ls.right, datum.tail(ls));
    testList(ls);
    var it = testEmptyList(null);
    assert.equal(null, it);
    testSingleItemList(datum.list(1));
  });

  it('should get the tail of an array', function () {
    testList([1, 2, 3, 4]);
    testEmptyList([]);
    testSingleItemList([1]);
  });

  it('should get the tail of an array-like object', function () {
    (function () {
      testList(arguments);
    })(1, 2, 3, 4);
    (function () {
      testEmptyList(arguments);
    })();
    (function () {
      testSingleItemList(arguments);
    })(1);
  });
});

describe('init', function () {
  var testList = function (a) {
    var it = datum.init(a);
    assert.equal(3, datum.length(it));
    assert.equal(1, datum.nth(0, it));
    assert.equal(2, datum.nth(1, it));
    assert.equal(3, datum.nth(2, it));
    return it;
  };

  var testSingleItemList = function (ls) {
    var it = datum.init(ls);
    assert.equal(0, datum.length(it));
  };

  var testEmptyList = function (ls) {
    var it = datum.init(ls);
    assert.equal(0, datum.length(it));
    return it;
  };

  it('should get the init of a list', function () {
    var it;
    it = testList(datum.list(1, 2, 3, 4));
    assert.ok(datum.isList(it));
    it = testEmptyList(null);
    assert.equal(null, it);
    testSingleItemList(datum.list(1));
  });

  it('should get the init of an array', function () {
    var it;
    it = testList([1, 2, 3, 4]);
    assert.ok(it instanceof Array);
    testEmptyList([]);
    testSingleItemList([1]);
  });

  it('should get the init of an array-like object', function () {
    (function () {
      var it = testList(arguments);
      assert.ok(it instanceof Array);
    })(1, 2, 3, 4);
    (function () {
      testEmptyList(arguments);
    })();
    (function () {
      testSingleItemList(arguments);
    })(1);
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
    assert.ok(datum.isList(ls));
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
  it('should be able to filter lists', function () {
    var ls = datum.filter(function (x) {
      return x > 5;
    }, datum.list(3, 4, 5, 6, 7));
    assert.equal(6, datum.nth(0, ls));
    assert.equal(7, datum.nth(1, ls));
  });
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
