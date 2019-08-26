var _ = require('lodash');
var uuid = require('uuid').v4;
var Eventstore = require('./eventstore');

/**
 * Emit events before and after execution of eventstore methods.
 * @param {Function} eventstore - eventstore store instance
 */
function StoreEventEmitter(eventstore) {
  if (!eventstore || !(eventstore instanceof Eventstore)) {
    throw new Error('Provided eventstore must be instance of Eventstore');
  }

  var self = this;
  self.eventstore = eventstore;
  self.store = self.eventstore.store;

/**
 * 
 * @param {Array} args - arguments from original implementation except callback
 * @param {string} eventId - eventId to identify sub events
 * @param {string} [parentEventId] - optional parentEventId to find related parent event
 */
  function getEmitArguments(args, eventId, parentEventId) {
    var emitArguments = {
      milliseconds: Date.now(),
      arguments: args
    };

    if (!parentEventId) {
      emitArguments.eventId = eventId;
    } else {
      emitArguments.parentEventId = parentEventId;
    }

    return emitArguments;
  }

  /**
   * Enhance original callback to emit an event
   * @param {string} name - name which will be used to emit
   * @param {Function} callback - callback function from original implementation
   * @param {Array} args - arguments from original implementation except callback
   * @param {Function} eventstore - eventstore store instance
   * @param {string} eventId - eventId to identify sub events
   * @param {string} [parentEventId] - optional parentEventId to find related parent event
   */
  function enhanceCallback(name, callback, args, eventstore, eventId, parentEventId) {
    if (callback) {
      var originalCallback = callback;

      callback = function () {
        self.eventstore.emit.call(eventstore, 'after-' + name, getEmitArguments(args, eventId, parentEventId));
        return originalCallback.apply(this, arguments);
      };
    }

    return callback;
  }

  /**
   * add event emitter advice to eventstore method
   * @param {string} name - name which will be used to emit
   * @param {Function} eventstore - eventstore store instance
   * @param {Function} originalMethod  - original implementation which will be extended
   * @param {Array} args - arguments from original implementation except callback
   * @param {Function} callback - callback function from original implementation
   */
  function addEventEmitter(name, originalMethod, args, callback) {
    var parentEventId;
    args = _.without(args, undefined, null);

    if (self.eventId) {
      parentEventId = self.eventId;
    } else {
      self.eventId = uuid().toString();
    }

    callback = enhanceCallback(name, callback, args, self.eventstore, self.eventId, parentEventId);

    self.eventstore.emit.call(self.eventstore, 'before-' + name, getEmitArguments(args, self.eventId, parentEventId));
    return originalMethod.apply(this, _.concat(args, callback || []));
  };

  /**
   * Add event emitter to eventstore methods
   */
  StoreEventEmitter.prototype.addEventEmitter = function () {
    var eventstore = this.eventstore;
    var store = this.store;

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

    if (eventstore.getEvents) {
      var originalGetEvents = eventstore.getEvents;

      eventstore.getEvents = function (query, skip, limit, callback) {
        if (typeof query === 'function') {
          callback = query;
          query = undefined;
        } else if (typeof skip === 'function') {
          callback = skip;
          skip = undefined
        } else if (typeof limit === 'function') {
          callback = limit;
          limit = undefined;
        }

        return addEventEmitter.call(this, 'get-events', originalGetEvents, [query, skip, limit], callback);
      };
    }

    if (eventstore.getEventsSince) {
      var originalGetEventsSince = eventstore.getEventsSince;
      eventstore.getEventsSince = function (date, skip, limit, callback) {
        if (typeof skip === 'function') {
          callback = skip;
          skip = undefined;
        } else if (typeof limit === 'function') {
          callback = limit;
          limit = undefined;
        }

        return addEventEmitter.call(this, 'get-events-since', originalGetEventsSince, [date, skip, limit], callback);
      };
    }

    if (eventstore.getEventsByRevision) {
      var originalGetEventsByRevision = eventstore.getEventsByRevision;
      eventstore.getEventsByRevision = function (query, revMin, revMax, callback) {
        if (typeof revMin === 'function') {
          callback = revMin;
          revMin = undefined;
        } else if (typeof revMax === 'function') {
          callback = revMax;
          revMax = undefined;
        }

        return addEventEmitter.call(this, 'get-events-by-revision', originalGetEventsByRevision, [query, revMin, revMax], callback);
      };
    }

    if (eventstore.getLastEvent) {
      var originalGetLastEvent = eventstore.getLastEvent;
      eventstore.getLastEvent = function (query, callback) {
        return addEventEmitter.call(this, 'get-last-event', originalGetLastEvent, [query], callback);
      };
    }

    if (eventstore.getUndispatchedEvents) {
      var originalGetUndispatchedEvents = eventstore.getUndispatchedEvents;
      eventstore.getUndispatchedEvents = function (query, callback) {
        if (!callback) {
          callback = query;
          query = undefined;
        }

        return addEventEmitter.call(this, 'get-undispatched-events', originalGetUndispatchedEvents, [query], callback);
      };
    }

    if (eventstore.setEventToDispatched) {
      var originalSetEventToDispatched = eventstore.setEventToDispatched;
      eventstore.setEventToDispatched = function (id, callback) {
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

    if (eventstore.streamEvents) {
      var originalStreamEvents = eventstore.streamEvents;
      eventstore.streamEvents = function (query, skip, limit) {
        return addEventEmitter.call(this, 'stream-events', originalStreamEvents, [query, skip, limit]);
      };
    }

    if (eventstore.streamEventsSince) {
      var originalStreamEventsSince = eventstore.streamEventsSince;
      eventstore.streamEventsSince = function (date, skip, limit) {
        return addEventEmitter.call(this, 'stream-events-since', originalStreamEventsSince, [date, skip, limit]);
      };
    }

    if (eventstore.streamEventsByRevision) {
      var originalStreamEventsByRevision = eventstore.streamEventsByRevision;
      eventstore.streamEventsByRevision = function (query, revMin, revMax) {
        return addEventEmitter.call(this, 'stream-events-by-revision', originalStreamEventsByRevision, [query, revMin, revMax]);
      };
    }

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

        return addEventEmitter.call(this, 'get-event-stream', originalGetEventStream, [query, revMin, revMax], callback, true);
      };
    }

    if (eventstore.getFromSnapshot) {
      var originalGetFromSnapshot = eventstore.getFromSnapshot;
      eventstore.getFromSnapshot = function (query, revMax, callback) {
        if (typeof revMax === 'function') {
          callback = revMax;
          revMax = undefined;
        }

        return addEventEmitter.call(this, 'get-from-snapshot', originalGetFromSnapshot, [query, revMax], callback, true);
      };
    }

    if (eventstore.createSnapshot) {
      var originalCreateSnapshot = eventstore.createSnapshot;
      eventstore.createSnapshot = function (obj, callback) {
        return addEventEmitter.call(this, 'create-snapshot', originalCreateSnapshot, [obj], callback, true);
      };
    }

    if (eventstore.commit) {
      var originalCommit = eventstore.commit;
      eventstore.commit = function (eventstream, callback) {
        return addEventEmitter.call(this, 'commit', originalCommit, [eventstream], callback, true);
      };
    }

    if (eventstore.getLastEventAsStream) {
      var originalGetLastEventAsStream = eventstore.getLastEventAsStream;
      eventstore.getLastEventAsStream = function (query, callback) {
        return addEventEmitter.call(this, 'get-last-event-as-stream', originalGetLastEventAsStream, [query], callback);
      };
    }
  }
}


module.exports = StoreEventEmitter;
