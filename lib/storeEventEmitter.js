function addStoreEventEmitter(store, eventstore) {
  var originalAddEvents = store.prototype.addEvents;

  store.prototype.addEvents = function (events, callback) {
    var originalCallback = callback;

    callback = function() {
      eventstore.emit('after-add-events', Date.now(), events);
      return originalCallback.apply(this, arguments);
    };

    eventstore.emit('before-add-events', Date.now(), events);
    return originalAddEvents.apply(this, arguments);
  }
}

module.exports.addStoreEventEmitter = addStoreEventEmitter;
