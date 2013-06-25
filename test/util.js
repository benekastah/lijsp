
var assert = require('assert'),
    util = require('../util');

describe('asArray', function () {
  it('should return an array with a non-array argument as sole member', function () {
    assert.deepEqual([5], util.asArray(5));
  });

  it('should return an array argument untouched', function () {
    var a = [1, 2, 3];
    assert.equal(a, util.asArray(a));
  });
});

describe('indexOf', function () {
  it('returns the first index of an element in an array', function () {
    var a = [1, 2, 3, 2];
    assert.equal(1, util.indexOf(a, 2));
  });
});

describe('contains', function () {
  it('returns true if the item is in the array, false otherwise', function () {
    var a = [1, 2, 3, 4, 5, 6, 7];
    assert.ok(util.contains(a, 4));
    assert.ok(!util.contains(a, 8));
  });
});

describe('clone', function () {
  it('should make a new object with the input as prototype', function () {
    var base = {a: 1};
    var cln = util.clone(base);
    assert.equal(base, util.getPrototypeOf(cln));
  });
});

describe('getPrototypeOf', function () {
  it('should get the prototype of an object', function () {
    assert.equal(Object.prototype, util.getPrototypeOf({}));
  });
});

var Stream = util.Stream;
describe('Stream', function () {
  describe('#get', function () {
    it('should advance _p by length of returned result', function () {
      var stream = new Stream('abcd');
      var _p = stream._p;
      var result = stream.get(3);
      assert.ok(result);
      assert.equal(result.length, stream._p - _p);

      _p = stream._p;
      result = stream.get(3);
      assert.ok(result);
      assert.equal(result.length, stream._p - _p);
    });

    it('should get one character by default', function () {
      var stream = new Stream('asdf');
      assert.equal(1, stream.get().length);
    });

    it('should be able to set _p with an offset parameter', function () {
      var stream = new Stream('asdf - fdsa');
      assert.equal('df -', stream.get(2, 4));
    });
  });

  describe('#getRest', function () {
    it('should get the rest of the stream', function () {
      var stream = new Stream('I want to ride my bicycle.');
      stream.get(7);
      assert.equal('to ride my bicycle.', stream.getRest());
    });

    it('should be able to set _p with an offset parameter', function () {
      var stream = new Stream('abcdefg');
      assert.equal('defg', stream.getRest(3));
    });
  });

  describe('#peek', function () {
    it('should get result without advancing _p', function () {
      var stream = new Stream('abcdefg');
      var _p = stream._p;
      assert.equal('abc', stream.peek(3));
      assert.equal(_p, stream._p);
    });

    it('should be able to set _p with an offset parameter', function () {
      var stream = new Stream('asdf - fdsa');
      assert.equal('f', stream.peek(3, 1));
    });
  });

  describe('#peekRest', function () {
    it('should not advance _p', function () {
      var stream = new Stream('asdf fdsa');
      var _p = stream._p;
      stream.peekRest();
      assert.equal(_p, stream._p);
    });

    it('should get rest of the stream', function () {
      var stream = new Stream('I am a real man');
      assert.equal(stream.data, stream.peekRest());
    });

    it('should be able to set _p with an offset parameter', function () {
      var stream = new Stream('asdf - fdsa');
      assert.equal('f - fdsa', stream.peekRest(3));
    });
  });

  describe('#begin', function () {
    it('should not fail', function () {
      var stream = new Stream('asdf');
      assert.doesNotThrow(function () {
        stream.begin();
      });
    });

    it('should return the stream', function () {
      var stream = new Stream('asdf');
      assert.equal(stream, stream.begin());
    });
  });

  describe('#commit', function () {
    it('should throw Stream.TransactionError if begin has not been called', function () {
      var stream = new Stream('asdf');
      assert.throws(function () {
        stream.commit();
      }, Stream.TransactionError);
    });

    it('should not modify _p', function () {
      var stream = new Stream('hai!');
      stream.begin();
      stream.get(2);
      var _p = stream._p;
      stream.commit();
      assert.equal(_p, stream._p);

      // Stifle steam.rollback()s error because we will test that elsewhere.
      try { stream.rollback(); }
      catch (e) {}

      assert.equal(_p, stream._p);
    });
  });

  describe('#rollback', function () {
    it('should throw Stream.TransactionError if begin has not been called', function () {
      var stream = new Stream('adsf');
      assert.throws(function () {
        stream.rollback();
      }, Stream.TransactionError);
    });

    it('should revert _p back to its value before begin was called', function () {
      var stream = new Stream('cornwallish thingywop');
      stream.get();
      stream.begin();
      var _p = stream._p;
      stream.get(3);
      stream.rollback();
      assert.equal(_p, stream._p);
    });

    it('should work with nested transactions', function () {
      var stream = new Stream('a big emergency!!');

      stream.begin();
      var _p1 = stream._p;
      stream.get(2);

      stream.begin();
      var _p2 = stream._p;
      stream.get();

      stream.begin();
      var _p3 = stream._p;
      stream.get();
      stream.rollback();
      assert.equal(_p3, stream._p);

      stream.commit();
      assert.notEqual(_p2, stream._p);

      stream.rollback();
      assert.equal(_p1, stream._p);
    });
  });

  describe('#movePointer', function () {
    it('should be able to arbitrarily move the pointer', function () {
      var stream = new Stream('12345678');

      stream.movePointer(3);
      assert.equal(3, stream._p);

      stream.movePointer(-2);
      assert.equal(1, stream._p);
    });
  });

  describe('#getPointer', function () {
    it('should get _p instance property', function () {
      var stream = new Stream('');
      assert.equal(stream._p, stream.getPointer());
    });
  });

  describe('#setPointer', function () {
    it('should set _p instance property', function () {
      var stream = new Stream('asdf');
      var pos = 5;
      stream.setPointer(pos);
      assert.equal(pos, stream.getPointer());
    });
  });

  describe('#undo', function () {
    it('should undo the last movePointer operation', function () {
      var stream = new Stream('I am not a dog, but whatever');
      stream.get(2);
      var _p = stream._p;
      stream.get(10);
      assert.notEqual(_p, stream._p);
      stream.undo();
      assert.equal(_p, stream._p);
    });
  });

  describe('#exhausted', function () {
    it('should tell you if you are at the end of the stream', function () {
      var stream = new Stream('heyo');
      assert.ok(!stream.exhausted());
      stream.get(100);
      assert.ok(stream.exhausted());
    });
  });
});
