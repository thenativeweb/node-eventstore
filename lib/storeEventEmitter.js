var _ = require('lodash');

function addStoreEventEmitter(store, eventstore) {
  /**
   * add event emitter advice to eventstore method
   * @param {string} name - name which will be used to emit
   * @param {function} originalMethod  - original implementation which will be extended
   * @param {Array} args - arguments from original implementation except callback
   * @param {function} callback - callback function from original implementation
   */
  function addEventEmitter(name, originalMethod, args, callback) {
    var originalCallback = callback;

    callback = function () {
      eventstore.emit.apply(eventstore, _.concat('after-' + name, Date.now(), args));
      return originalCallback.apply(this, arguments);
    };

    eventstore.emit.apply(eventstore, _.concat('before-' + name, Date.now(), args));
    return originalMethod.apply(this, _.concat(args, callback));
  };

  /**
   * add event emitter as an around advice to database methods
   */
  if (store.prototype.clear) {
    var originalClear = store.prototype.clear;
    store.prototype.clear = function (callback) {
      return addEventEmitter.call(this, 'clear', originalClear, [], callback);
    };
  }

  if (store.prototype.getNextPositions) {
    var originalGetNextPositions = store.prototype.getNextPositions;
    store.prototype.getNextPositions = function (positions, callback) {
      return addEventEmitter.call(this, 'get-next-positions', originalGetNextPositions, [positions], callback);
    };
  }

  if (store.prototype.addEvents) {
    var originalAddEvents = store.prototype.addEvents;
    store.prototype.addEvents = function (events, callback) {
      return addEventEmitter.call(this, 'add-events', originalAddEvents, [events], callback);
    };
  }

  if (store.prototype.getEvents) {
    var originalGetEvents = store.prototype.getEvents;
    store.prototype.getEvents = function (query, skip, limit, callback) {
      return addEventEmitter.call(this, 'get-events', originalGetEvents, [query, skip, limit], callback);
    };
  }

  if (store.prototype.getEventsSince) {
    var originalGetEventsSince = store.prototype.getEventsSince;
    store.prototype.getEventsSince = function (date, skip, limit, callback) {
      return addEventEmitter.call(this, 'get-events-since', originalGetEventsSince, [date, skip, limit], callback);
    };
  }

  if (store.prototype.getEventsByRevision) {
    var originalGetEventsByRevision = store.prototype.getEventsByRevision;
    store.prototype.getEventsByRevision = function (query, revMin, revMax, callback) {
      return addEventEmitter.call(this, 'get-events-by-revision', originalGetEventsByRevision, [query, revMin, revMax], callback);
    };
  }

  if (store.prototype.getLastEvent) {
    var originalGetLastEvent = store.prototype.getLastEvent;
    store.prototype.getLastEvent = function (query, callback) {
      return addEventEmitter.call(this, 'get-last-event', originalGetLastEvent, [query], callback);
    };
  }

  if (store.prototype.getUndispatchedEvents) {
    var originalGetUndispatchedEvents = store.prototype.getUndispatchedEvents;
    store.prototype.getUndispatchedEvents = function (query, callback) {
      return addEventEmitter.call(this, 'get-undispatched-events', originalGetUndispatchedEvents, [query], callback);
    };
  }

  if (store.prototype.setEventToDispatched) {
    var originalSetEventToDispatched = store.prototype.setEventToDispatched;
    store.prototype.setEventToDispatched = function (id, callback) {
      return addEventEmitter.call(this, 'set-event-to-dispatched', originalSetEventToDispatched, [id], callback);
    };
  }

  if (store.prototype.addSnapshot) {
    var originalAddSnapshots = store.prototype.addSnapshot;
    store.prototype.addSnapshot = function (snap, callback) {
      return addEventEmitter.call(this, 'add-snapshot', originalAddSnapshots, [snap], callback);
    };
  }

  if (store.prototype.cleanSnapshots) {
    var originalCleanSnapshots = store.prototype.cleanSnapshots;
    store.prototype.cleanSnapshots = function (query, callback) {
      return addEventEmitter.call(this, 'clean-snapshots', originalCleanSnapshots, [query], callback);
    };
  }

  if (store.prototype.getSnapshot) {
    var originalGetSnapshot = store.prototype.getSnapshot;
    store.prototype.getSnapshot = function (query, revMax, callback) {
      return addEventEmitter.call(this, 'get-snapshot', originalGetSnapshot, [query, revMax], callback);
    };
  }

  if (store.prototype.removeTransactions) {
    var originalRemoveTransactions = store.prototype.removeTransactions;
    store.prototype.removeTransactions = function (evt, callback) {
      return addEventEmitter.call(this, 'remove-transactions', originalRemoveTransactions, [evt], callback);
    };
  }

  if (store.prototype.getPendingTransactions) {
    var originalGetPendingTransactions = store.prototype.getPendingTransactions;
    store.prototype.getPendingTransactions = function (callback) {
      return addEventEmitter.call(this, 'get-pending-transactions', originalGetPendingTransactions, [], callback);
    };
  }

  if (store.prototype.repairFailedTransaction) {
    var originalRepairFailedTransaction = store.prototype.repairFailedTransaction;
    store.prototype.repairFailedTransaction = function (lastEvt, callback) {
      return addEventEmitter.call(this, 'repair-failed-transactions', originalRepairFailedTransaction, [lastEvt], callback);
    };
  }

  if (store.prototype.removeTables) {
    var originalRemoveTables = store.prototype.removeTables;
    store.prototype.removeTables = function (callback) {
      return addEventEmitter.call(this, 'remove-tables', originalRemoveTables, [], callback);
    };
  }
}

module.exports.addStoreEventEmitter = addStoreEventEmitter;
