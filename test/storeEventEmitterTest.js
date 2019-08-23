var expect = require('expect.js');
var eventstore = require('../');
var addStoreEventEmitter = require('../lib/storeEventEmitter').addStoreEventEmitter;

function beforeEachMethod(eventName) {
  var self = this;

  self.es.on('before-' + eventName, function (timestamp) {
    self.receivedBeforeTimestamp = timestamp;
    self.receivedBefore = true;
  });

  self.es.on('after-' + eventName, function (timestamp) {
    self.receivedAfter = true;
    self.receivedAfterTimestamp = timestamp;
  });
};

function expectEventEmittedAndTimestamps() {
  expect(this.receivedBefore).to.eql(true);
  expect(this.receivedAfter).to.eql(true);
  expect(this.receivedBeforeTimestamp).to.be.a('number');
  expect(this.receivedAfterTimestamp).to.be.a('number');
}

describe('storeEventEmitter', function () {
  describe('addStoreEventEmitter', function () {
    it('it should be a function', function () {
      expect(addStoreEventEmitter).to.be.a('function');
    });
  });

  describe('without eventstore as option', function () {
    it('it should throw an error', function () {
      expect(function () {
        addStoreEventEmitter();
      }).to.throwError();
    });
  });

  describe('with wrong eventstore instance as option', function () {
    var es;

    before(function () {
      es = Object.create({});
    });

    it('it should throw an error', function () {
      expect(function () {
        addStoreEventEmitter(es);
      }).to.throwError();
    });
  });

  describe('calling that method', function () {
    var self = this;

    self.es;
    self.receivedBefore;
    self.receivedAfter;
    self.receivedBeforeTimestamp;
    self.receivedAfterTimestamp;

    beforeEach(function () {
      self.es = eventstore();
      self.receivedBefore = false;
      self.receivedAfter = false;
      self.receivedBeforeTimestamp = undefined;
      self.receivedAfterTimestamp = undefined;
    });

    afterEach(function () {
      self.es.removeAllListeners();
    });

    describe('clear', function () {
      beforeEach(beforeEachMethod.bind(self, 'clear'));

      it('it should emit the correct events', function (done) {
        self.es.store.clear(function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('getNextPositions', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-next-positions'));

      it('it should emit the correct events', function (done) {
        self.es.store.getNextPositions(4, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('addEvents', function () {
      beforeEach(beforeEachMethod.bind(self, 'add-events'));

      it('it should emit the correct events with valid parameters', function (done) {
        self.es.store.addEvents([{ one: 'event1' }], function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with empty events array', function (done) {
        self.es.store.addEvents([], function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('getEvents', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-events'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getEvents({ aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' }, 2, 32, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with only callback parameter', function (done) {
        self.es.getEvents(function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of skip parameter', function (done) {
        self.es.getEvents({ aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' }, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of limit parameter', function (done) {
        self.es.getEvents({ aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' }, 2, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('getEventsSince', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-events-since'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getEventsSince(new Date(2000, 1, 1), 0, 3, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of skip parameter', function (done) {
        self.es.getEventsSince(new Date(2000, 1, 1), function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of limit parameter', function (done) {
        self.es.getEventsSince(new Date(2000, 1, 1), 0, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('getEventsByRevision', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-events-by-revision'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getEventsByRevision('myQuery', 3, 100, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMin parameter', function (done) {
        self.es.getEventsByRevision('myQuery', function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMax parameter', function (done) {
        self.es.getEventsByRevision('myQuery', 3, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('getLastEvent', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-last-event'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getLastEvent('myQuery', function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('getUndispatchedEvents', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-undispatched-events'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getUndispatchedEvents('myQuery', function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with only callback parameter', function (done) {
        self.es.getUndispatchedEvents(function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('setEventToDispatched', function () {
      beforeEach(function () {
        beforeEachMethod.call(self, 'set-event-to-dispatched');

        self.es.store.setEventToDispatched = function (_id, callback) {
          return callback();
        };

        addStoreEventEmitter(self.es);
      });

      it('it should emit the correct events with all parameters', function (done) {
        self.es.setEventToDispatched('my-id', function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('addSnapshot', function () {
      beforeEach(beforeEachMethod.bind(self, 'add-snapshot'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.store.addSnapshot('myAggId', function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('cleanSnapshots', function () {
      beforeEach(beforeEachMethod.bind(self, 'clean-snapshots'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.store.cleanSnapshots('myQuery', function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('getSnapshot', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-snapshot'));

      it('it should emit the correct events', function (done) {
        self.es.store.getSnapshot('myQuery', 100, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('getEventStream', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-event-stream'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getEventStream('myQuery', 3, 100, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMin parameter', function (done) {
        self.es.getEventStream('myQuery', function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMax parameter', function (done) {
        self.es.getEventStream('myQuery', 3, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('getFromSnapshot', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-from-snapshot'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getFromSnapshot('myQuery', 100, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMax parameter', function (done) {
        self.es.getFromSnapshot('myQuery', function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('createSnapshot', function () {
      beforeEach(beforeEachMethod.bind(self, 'create-snapshot'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.createSnapshot({ aggregateId: 'myAggId' }, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('commit', function () {
      beforeEach(function () {
        beforeEachMethod.call(self, 'commit');

        self.es.commit = function (_eventstream, callback) {
          return callback();
        };

        addStoreEventEmitter(self.es);
      });

      it('it should emit the correct events with all parameters', function (done) {
        self.es.commit({}, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });

    describe('getLastEventAsStream', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-last-event-as-stream'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getLastEventAsStream({ aggregateId: 'myAggId' }, function () {
          expectEventEmittedAndTimestamps.call(self);
          done();
        });
      });
    });
  });
});
