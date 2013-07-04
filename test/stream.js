
var assert = require('assert'),
    stream = require('../stream'),
    util = require('../util');

var Stream = stream.Stream;
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

var WritableStream = stream.WritableStream;
describe('WritableStream', function () {
  describe('#set', function () {
    it('should be able to overwrite data in the stream', function () {
      var stream = new WritableStream('asdf');
      stream.set('df');
      assert.equal('dfdf', stream.data);
    });

    it('should be able to overwrite data in the middle of the stream', function () {
      var stream = new WritableStream('I am a dog, man.');
      stream.movePointer(7);
      stream.set('god');
      assert.equal('I am a god, man.', stream.data);
    });
  });

  describe('#append', function () {
    it('should be able to append data to the stream', function () {
      var stream = new WritableStream('as');
      stream.append('df');
      assert.equal('asdf', stream.data);
    });
  });
});
