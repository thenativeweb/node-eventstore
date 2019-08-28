var expect = require('expect.js');
var eventstore = require('../');
var StoreEventEmitter = require('../lib/storeEventEmitter');

function beforeEachMethod(eventName) {
  var self = this;

  self.es.on('before-' + eventName, function (result) {
    self.receivedBeforeResult = result;
    self.receivedBefore = true;
  });

  self.es.on('after-' + eventName, function (result) {
    self.receivedAfter = true;
    self.receivedAfterResult = result;
  });
}

function resetCheckValues() {
  this.receivedBefore = false;
  this.receivedAfter = false;
  this.receivedBeforeResult = undefined;
  this.receivedAfterResult = undefined;
}

function expectEventsEmitted() {
  expect(this.receivedBefore).to.eql(true);
  expect(this.receivedAfter).to.eql(true);
  expect(this.receivedBeforeResult).to.be.a(Object);
  expect(this.receivedAfterResult).to.be.a(Object);
  expect(this.receivedBeforeResult.milliseconds).to.be.a('number');
  expect(this.receivedAfterResult.milliseconds).to.be.a('number');
}

function expectEventsNotEmitted() {
  expect(this.receivedBefore).to.eql(false);
  expect(this.receivedAfter).to.eql(false);
  expect(this.receivedBeforeResult).to.eql(undefined);
  expect(this.receivedAfterResult).to.eql(undefined);
}

describe('StoreEventEmitter', function () {
  describe('create instance', function() {
    it('it should throw an error if instantiated without eventstore', function () {
      expect(function () {
        new StoreEventEmitter();
      }).to.throwError();
    });

    it('it should be instance of StoreEventEmitter', function () {
      var storeEventEmitter = new StoreEventEmitter(eventstore());
      expect(storeEventEmitter).to.be.a(StoreEventEmitter);
    });

    it('addEventEmitter should be a function', function () {
      var storeEventEmitter = new StoreEventEmitter(eventstore());
      expect(storeEventEmitter.addEventEmitter).to.be.a('function');
    });
  });

  describe('emit store events is disabled by default', function() {
    var self = this;

    beforeEach(function () {
      self.es = eventstore();
      resetCheckValues.call(self);
    });

    afterEach(function () {
      self.es.removeAllListeners();
    });
  
    it('it should not emit any events', function(done) {
      self.es.store.addEvents([], function () {
        expectEventsNotEmitted.call(self);
        done();
      });
    });
  });

  describe('calling that method', function () {
    var self = this;

    beforeEach(function () {
      self.es = eventstore({ emitStoreEvents: true });
      resetCheckValues.call(self);
    });

    afterEach(function () {
      self.es.removeAllListeners();
    });

    describe('clear', function () {
      beforeEach(beforeEachMethod.bind(self, 'clear'));

      it('it should emit the correct events', function (done) {
        self.es.store.clear(function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('getNextPositions', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-next-positions'));

      it('it should emit the correct events', function (done) {
        self.es.store.getNextPositions(4, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('addEvents', function () {
      beforeEach(beforeEachMethod.bind(self, 'add-events'));

      it('it should emit the correct events with valid parameters', function (done) {
        self.es.store.addEvents([{ one: 'event1' }], function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with empty events array', function (done) {
        self.es.store.addEvents([], function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('getEvents', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-events'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getEvents({ aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' }, 2, 32, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with only callback parameter', function (done) {
        self.es.getEvents(function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of skip parameter', function (done) {
        self.es.getEvents({ aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' }, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of limit parameter', function (done) {
        self.es.getEvents({ aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' }, 2, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('getEventsSince', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-events-since'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getEventsSince(new Date(2000, 1, 1), 0, 3, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of skip parameter', function (done) {
        self.es.getEventsSince(new Date(2000, 1, 1), function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of limit parameter', function (done) {
        self.es.getEventsSince(new Date(2000, 1, 1), 0, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('getEventsByRevision', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-events-by-revision'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getEventsByRevision('myQuery', 3, 100, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMin parameter', function (done) {
        self.es.getEventsByRevision('myQuery', function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMax parameter', function (done) {
        self.es.getEventsByRevision('myQuery', 3, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('getLastEvent', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-last-event'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getLastEvent('myQuery', function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('getUndispatchedEvents', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-undispatched-events'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getUndispatchedEvents('myQuery', function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with only callback parameter', function (done) {
        self.es.getUndispatchedEvents(function () {
          expectEventsEmitted.call(self);
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

        var storeEventEmitter = new StoreEventEmitter(self.es);
        storeEventEmitter.addEventEmitter();
      });

      it('it should emit the correct events with all parameters', function (done) {
        self.es.setEventToDispatched('my-id', function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('addSnapshot', function () {
      beforeEach(beforeEachMethod.bind(self, 'add-snapshot'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.store.addSnapshot('myAggId', function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('cleanSnapshots', function () {
      beforeEach(beforeEachMethod.bind(self, 'clean-snapshots'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.store.cleanSnapshots('myQuery', function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('getSnapshot', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-snapshot'));

      it('it should emit the correct events', function (done) {
        self.es.store.getSnapshot('myQuery', 100, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('getEventStream', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-event-stream'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getEventStream('myQuery', 3, 100, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMin parameter', function (done) {
        self.es.getEventStream('myQuery', function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMax parameter', function (done) {
        self.es.getEventStream('myQuery', 3, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('getFromSnapshot', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-from-snapshot'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getFromSnapshot('myQuery', 100, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMax parameter', function (done) {
        self.es.getFromSnapshot('myQuery', function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('createSnapshot', function () {
      beforeEach(beforeEachMethod.bind(self, 'create-snapshot'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.createSnapshot({ aggregateId: 'myAggId' }, function () {
          expectEventsEmitted.call(self);
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

        var storeEventEmitter = new StoreEventEmitter(self.es);
        storeEventEmitter.addEventEmitter();
      });

      it('it should emit the correct events with all parameters', function (done) {
        self.es.commit({}, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });

    describe('getLastEventAsStream', function () {
      beforeEach(beforeEachMethod.bind(self, 'get-last-event-as-stream'));

      it('it should emit the correct events with all parameters', function (done) {
        self.es.getLastEventAsStream({ aggregateId: 'myAggId' }, function () {
          expectEventsEmitted.call(self);
          done();
        });
      });
    });
  });
});
