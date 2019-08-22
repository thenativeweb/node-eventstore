var _ = require('lodash');
var Eventstore = require('./eventstore');

/**
 * 
 * @param {Function} eventstore - eventstore store instance
 */
function addStoreEventEmitter(eventstore) {
  if (!eventstore || !(eventstore instanceof Eventstore)) {
    throw new Error('Provided eventstore must be instance of Eventstore');
  }

  var store = eventstore.store;

  /**
   * add event emitter advice to eventstore method
   * @param {string} name - name which will be used to emit
   * @param {Function} originalMethod  - original implementation which will be extended
   * @param {Array} args - arguments from original implementation except callback
   * @param {Function} callback - callback function from original implementation
   */
  function addEventEmitter(name, originalMethod, args, callback) {
    var originalCallback = callback;

    if (callback) {
      callback = function () {
        eventstore.emit.apply(eventstore, _.concat('after-' + name, Date.now(), args));
        return originalCallback.apply(this, arguments);
      };
    }

    eventstore.emit.apply(eventstore, _.concat('before-' + name, Date.now(), args));
    return originalMethod.apply(this, _.concat(args, callback || []));
  };

  /**
   * add event emitter as an around advice to database methods
   */
  if (store.clear) {
    var originalClear = store.clear;
    store.clear = function (callback) {
      return addEventEmitter.call(this, 'clear', originalClear, [], callback);
    };
  }

  if (store.getNextPositions) {
    var originalGetNextPositions = store.getNextPositions;
    store.getNextPositions = function (positions, callback) {
      return addEventEmitter.call(this, 'get-next-positions', originalGetNextPositions, [positions], callback);
    };
  }

  if (store.addEvents) {
    var originalAddEvents = store.addEvents;
    store.addEvents = function (events, callback) {
      return addEventEmitter.call(this, 'add-events', originalAddEvents, [events], callback);
    };
  }

  if (store.getEvents) {
    var originalGetEvents = store.getEvents;
    store.getEvents = function (query, skip, limit, callback) {
      return addEventEmitter.call(this, 'get-events', originalGetEvents, [query, skip, limit], callback);
    };
  }

  if (store.getEventsSince) {
    var originalGetEventsSince = store.getEventsSince;
    store.getEventsSince = function (date, skip, limit, callback) {
      return addEventEmitter.call(this, 'get-events-since', originalGetEventsSince, [date, skip, limit], callback);
    };
  }

  if (store.getEventsByRevision) {
    var originalGetEventsByRevision = store.getEventsByRevision;
    store.getEventsByRevision = function (query, revMin, revMax, callback) {
      return addEventEmitter.call(this, 'get-events-by-revision', originalGetEventsByRevision, [query, revMin, revMax], callback);
    };
  }

  if (store.getLastEvent) {
    var originalGetLastEvent = store.getLastEvent;
    store.getLastEvent = function (query, callback) {
      return addEventEmitter.call(this, 'get-last-event', originalGetLastEvent, [query], callback);
    };
  }

  if (store.getUndispatchedEvents) {
    var originalGetUndispatchedEvents = store.getUndispatchedEvents;
    store.getUndispatchedEvents = function (query, callback) {
      return addEventEmitter.call(this, 'get-undispatched-events', originalGetUndispatchedEvents, [query], callback);
    };
  }

  if (store.setEventToDispatched) {
    var originalSetEventToDispatched = store.setEventToDispatched;
    store.setEventToDispatched = function (id, callback) {
      return addEventEmitter.call(this, 'set-event-to-dispatched', originalSetEventToDispatched, [id], callback);
    };
  }

  if (store.addSnapshot) {
    var originalAddSnapshots = store.addSnapshot;
    store.addSnapshot = function (snap, callback) {
      return addEventEmitter.call(this, 'add-snapshot', originalAddSnapshots, [snap], callback);
    };
  }

  if (store.cleanSnapshots) {
    var originalCleanSnapshots = store.cleanSnapshots;
    store.cleanSnapshots = function (query, callback) {
      return addEventEmitter.call(this, 'clean-snapshots', originalCleanSnapshots, [query], callback);
    };
  }

  if (store.getSnapshot) {
    var originalGetSnapshot = store.getSnapshot;
    store.getSnapshot = function (query, revMax, callback) {
      return addEventEmitter.call(this, 'get-snapshot', originalGetSnapshot, [query, revMax], callback);
    };
  }

  if (store.removeTransactions) {
    var originalRemoveTransactions = store.removeTransactions;
    store.removeTransactions = function (evt, callback) {
      return addEventEmitter.call(this, 'remove-transactions', originalRemoveTransactions, [evt], callback);
    };
  }

  if (store.getPendingTransactions) {
    var originalGetPendingTransactions = store.getPendingTransactions;
    store.getPendingTransactions = function (callback) {
      return addEventEmitter.call(this, 'get-pending-transactions', originalGetPendingTransactions, [], callback);
    };
  }

  if (store.repairFailedTransaction) {
    var originalRepairFailedTransaction = store.repairFailedTransaction;
    store.repairFailedTransaction = function (lastEvt, callback) {
      return addEventEmitter.call(this, 'repair-failed-transactions', originalRepairFailedTransaction, [lastEvt], callback);
    };
  }

  if (store.removeTables) {
    var originalRemoveTables = store.removeTables;
    store.removeTables = function (callback) {
      return addEventEmitter.call(this, 'remove-tables', originalRemoveTables, [], callback);
    };
  }

  if (store.streamEvents) {
    var originalStreamEvents = store.streamEvents;
    store.streamEvents = function(query, skip, limit) {
      return addEventEmitter.call(this, 'stream-events', originalStreamEvents, [query, skip, limit]);
    };
  }

  if (store.streamEventsSince) {
    var originalStreamEventsSince = store.streamEventsSince;
    store.streamEventsSince = function(date, skip, limit) {
      return addEventEmitter.call(this, 'stream-events-since', originalStreamEventsSince, [date, skip, limit]);
    };
  }

  if (store.streamEventsByRevision) {
    var originalStreamEventsByRevision = store.streamEventsByRevision;
    store.streamEventsByRevision = function(date, revMin, revMax) {
      return addEventEmitter.call(this, 'stream-events-since', originalStreamEventsByRevision, [date, revMin, revMax]);
    };
  }

  // might some identifiers needed
  if (eventstore.getEventStream) {
    var originalGetEventStream = eventstore.getEventStream;
    eventstore.getEventStream = function (query, revMin, revMax, callback) {
      if (typeof revMin === 'function') {
        callback = revMin;
        revMin = undefined;
      } else if (typeof revMax === 'function') {
        callback = revMax;
        revMax = undefined;
      }

      return addEventEmitter.call(this, 'get-event-stream', originalGetEventStream, _.without([query, revMin, revMax], undefined, null), callback)
    };
  }

  if (eventstore.getFromSnapshot) {  
    var originalGetFromSnapshot = eventstore.getFromSnapshot;
    eventstore.getFromSnapshot = function (query, revMax, callback) {
      if (typeof revMax === 'function') {
        callback = revMax;
        revMax = undefined;
      }
  
      return addEventEmitter.call(this, 'get-from-snapshot', originalGetFromSnapshot, _.without([query, revMax], undefined, null), callback);
    };
  }

  if (eventstore.createSnapshot) {
    var originalCreateSnapshot = eventstore.createSnapshot;
    eventstore.createSnapshot = function(obj, callback) {
      return addEventEmitter.call(this, 'create-snapshot', originalCreateSnapshot, [obj], callback);
    };
  }

  if (eventstore.commit) {
    var originalCommit = eventstore.commit;
    eventstore.commit = function(eventstream, callback) {
      return addEventEmitter.call(this, 'commit', originalCommit, [eventstream], callback);
    };
  }

  if (eventstore.getLastEventAsStream) {
    var originalGetLastEventAsStream = eventstore.getLastEventAsStream;
    eventstore.getLastEventAsStream = function(query, callback) {
      return addEventEmitter.call(this, 'get-last-event-as-stream', originalGetLastEventAsStream, [query], callback);
    };
  }
}

module.exports.addStoreEventEmitter = addStoreEventEmitter;
