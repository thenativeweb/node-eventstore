var expect = require('expect.js');
var eventstore = require('../');
var addStoreEventEmitter = require('../lib/storeEventEmitter').addStoreEventEmitter;

describe('storeEventEmitter', function() {
  describe('addStoreEventEmitter', function() {
    it('it should be a function', function () {
      expect(addStoreEventEmitter).to.be.a('function');
    });
  });

  describe('without eventstore as option', function() {
    it('it should throw an error', function() {
      expect(function () {
        addStoreEventEmitter();
      }).to.throwError();
    });
  });

  describe('with wrong eventstore instance as option', function() {
    var es;

    before(function() {
      es = Object.create({});
    });

    it('it should throw an error', function () {
      expect(function () {
        addStoreEventEmitter(es);
      }).to.throwError();
    });
  });

  describe('calling that function', function() {
    var es;
    var receivedBefore;
    var receivedAfter;
  
    beforeEach(function() {
      es = eventstore();
      receivedBefore = false;
      receivedAfter = false;
    });

    afterEach(function() {
      es.removeAllListeners();
    });

    describe('clear', function() {
      beforeEach(function() {
        es.on('before-clear', function () { receivedBefore = true; });
        es.on('after-clear', function () { receivedAfter = true; });
      });

      it('it should emit the correct events', function(done) {
        es.store.clear(function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('getNextPositions', function () {
      beforeEach(function() {
        es.on('before-get-next-positions', function () { receivedBefore = true; });
        es.on('after-get-next-positions', function () { receivedAfter = true; });
      });

      it('it should emit the correct events', function (done) {
        es.store.getNextPositions(4, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('addEvents', function () {
      beforeEach(function () {
        es.on('before-add-events', function () { receivedBefore = true; });
        es.on('after-add-events', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with valid parameters', function (done) {
        es.store.addEvents([{ one: 'event1' }], function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with empty events array', function (done) {
        es.store.addEvents([], function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('getEvents', function () {
      beforeEach(function () {
        es.on('before-get-events', function () { receivedBefore = true; });
        es.on('after-get-events', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.getEvents({ aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' }, 2, 32, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with only callback parameter', function (done) {
        es.getEvents(function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with callback instead of skip parameter', function (done) {
        es.getEvents({ aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' }, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with callback instead of limit parameter', function (done) {
        es.getEvents({ aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' }, 2, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('getEventsSince', function () {
      beforeEach(function () {
        es.on('before-get-events-since', function () { receivedBefore = true; });
        es.on('after-get-events-since', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.getEventsSince(new Date(2000, 1, 1), 0, 3, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with callback instead of skip parameter', function (done) {
        es.getEventsSince(new Date(2000, 1, 1), function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with callback instead of limit parameter', function (done) {
        es.getEventsSince(new Date(2000, 1, 1), 0, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });
  
    describe('getEventsByRevision', function () {
      beforeEach(function () {
        es.on('before-get-events-by-revision', function () { receivedBefore = true; });
        es.on('after-get-events-by-revision', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.getEventsByRevision('myQuery', 3, 100, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMin parameter', function (done) {
        es.getEventsByRevision('myQuery', function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMax parameter', function (done) {
        es.getEventsByRevision('myQuery', 3, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });
  
    describe('getLastEvent', function () {
      beforeEach(function () {
        es.on('before-get-last-event', function () { receivedBefore = true; });
        es.on('after-get-last-event', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.getLastEvent('myQuery', function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('getUndispatchedEvents', function () {
      beforeEach(function () {
        es.on('before-get-undispatched-events', function () { receivedBefore = true; });
        es.on('after-get-undispatched-events', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.getUndispatchedEvents('myQuery', function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with only callback parameter', function (done) {
        es.getUndispatchedEvents(function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('setEventToDispatched', function () {
      beforeEach(function () {
        es.on('before-set-event-to-dispatched', function () { receivedBefore = true; });
        es.on('after-set-event-to-dispatched', function () { receivedAfter = true; });

        es.store.setEventToDispatched = function (_id, callback) {
          return callback();
        };
        addStoreEventEmitter(es);
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.setEventToDispatched('my-id', function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('addSnapshot', function () {
      beforeEach(function () {
        es.on('before-add-snapshot', function () { receivedBefore = true; });
        es.on('after-add-snapshot', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.store.addSnapshot('myAggId', function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('cleanSnapshots', function () {
      beforeEach(function () {
        es.on('before-clean-snapshots', function () { receivedBefore = true; });
        es.on('after-clean-snapshots', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.store.cleanSnapshots('myQuery', function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('getSnapshot', function () {
      beforeEach(function () {
        es.on('before-get-snapshot', function () { receivedBefore = true; });
        es.on('after-get-snapshot', function () { receivedAfter = true; });
      });

      it('it should emit the correct events', function (done) {
        es.store.getSnapshot('myQuery', 100, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });
  
    describe('getEventStream', function () {
      beforeEach(function () {
        es.on('before-get-event-stream', function () { receivedBefore = true; });
        es.on('after-get-event-stream', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.getEventStream('myQuery', 3, 100, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMin parameter', function (done) {
        es.getEventStream('myQuery', function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMax parameter', function (done) {
        es.getEventStream('myQuery', 3, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });
  
    describe('getFromSnapshot', function () {
      beforeEach(function () {
        es.on('before-get-from-snapshot', function () { receivedBefore = true; });
        es.on('after-get-from-snapshot', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.getFromSnapshot('myQuery', 100, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });

      it('it should emit the correct events with callback instead of revMax parameter', function (done) {
        es.getFromSnapshot('myQuery', function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('createSnapshot', function () {
      beforeEach(function () {
        es.on('before-create-snapshot', function () { receivedBefore = true; });
        es.on('after-create-snapshot', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.createSnapshot({ aggregateId: 'myAggId' }, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('commit', function () {
      beforeEach(function () {
        es.on('before-commit', function () { receivedBefore = true; });
        es.on('after-commit', function () { receivedAfter = true; });

        es.commit = function (_eventstream, callback) {
          return callback();
        };
        addStoreEventEmitter(es);
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.commit({}, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });

    describe('getLastEventAsStream', function () {
      beforeEach(function () {
        es.on('before-get-last-event-as-stream', function () { receivedBefore = true; });
        es.on('after-get-last-event-as-stream', function () { receivedAfter = true; });
      });

      it('it should emit the correct events with all parameters', function (done) {
        es.getLastEventAsStream({ aggregateId: 'myAggId' }, function () {
          expect(receivedBefore).to.eql(true);
          expect(receivedAfter).to.eql(true);
          done();
        });
      });
    });
  });
});
