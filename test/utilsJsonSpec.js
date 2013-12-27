var expect = require('expect.js')
  , json = require('../lib/json'); /* just needs to be required - appends to JSON */

describe('utils.json', function() {

  describe('it deserializes a simple object', function() {

    it('with string value', function() {
      var res = JSON.deserialize('{ "test": "string" }');
      expect(res.test).to.be('string');
    });

    it('with number value', function() {
      var res = JSON.deserialize('{ "test": 1 }');
      expect(res.test).to.be(1);
    });

    it('with date value', function() {
      var now = new Date()
        , serialized = JSON.stringify({test: now});
      var res = JSON.deserialize(serialized);
      expect(res.test).to.be.eql(now);
      expect(res.test).to.be.a(Date);
    });

    it('with array of strings value', function() {
      var array = ['a', 'b']
        , serialized = JSON.stringify({test: array});
      var res = JSON.deserialize(serialized);
      expect(res.test).to.be.eql(array);
      expect(res.test).to.be.a(Array);
    });

    it('with array of objects value', function() {
      var now = new Date()
        , array = [{ a: 'string1', b: 1, c: now}, { a: 'string2', b: 2, c: now}]
        , serialized = JSON.stringify({test: array});
      var res = JSON.deserialize(serialized);
      expect(res.test).to.be.eql(array);
      expect(res.test).to.be.a(Array);
      expect(res.test[0].c).to.be.a(Date);
    });

    it('with object value', function() {
      var now = new Date()
        , obj = { a: 'string1', b: 1, c: now}
        , serialized = JSON.stringify({test: obj});
      var res = JSON.deserialize(serialized);
      expect(res.test).to.be.eql(obj);
      expect(res.test.c).to.be.a(Date);
    });

    it('with string value equal pattern of array', function() {
      var serialized = JSON.stringify({test: "[string]"});
      var res = JSON.deserialize(serialized);
      expect(res.test).to.be('[string]');
    });

  });

});