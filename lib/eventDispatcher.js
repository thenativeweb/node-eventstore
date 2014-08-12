'use strict';

var debug = require('debug')('eventstore:eventdispatcher');

/**
 * Eventstore constructor
 * @param {Object} options The options.
 * @param publisher the publisher that should be injected
 * @param store the store that should be injected
 * @constructor
 */
function EventDispatcher(options, publisher, store) {
  this.options = options || {};
  this.options.publishingInterval = this.options.publishingInterval || 100;
  this.publisher = publisher;
  this.store = store;
  this.undispatchedEventsQueue = [];
};

EventDispatcher.prototype = {

  /**
   * Queues the passed in events for dispatching.
   * @param events
   */
  addUndispatchedEvents: function(events) {
    var self = this;
    events.forEach(function(event) {
      self.undispatchedEventsQueue.push(event);
    });
  },

  /**
   * Starts the instance to publish all undispatched events.
   * @param callback the function that will be called when this action has finished
   */
  start: function(callback) {

    if (!this.store) {
      var storeError = new Error('Store not injected!');
      debug(storeError);
      if (callback) callback(storeError)
      return;
    }

    if (!this.publisher) {
      var pubError = new Error('Publisher not injected!');
      debug(pubError);
      if (callback) callback(pubError)
      return;
    }

    var self = this;

    // Get all undispatched events from store and queue them 
    // before all other events passed in by the addUndispatchedEvents function.
    this.store.getUndispatchedEvents(function(err, events) {
      
      if (err) {
        debug(err);
        if (callback) callback(err);
        return;
      }

      if (events) {
        for (var i = 0, len = events.length; i < len; i++) {
          self.undispatchedEventsQueue.push(events[i]);
        }
      }
      
      var isRunning = false;

      setInterval(function() {
        var queue = self.undispatchedEventsQueue || []
        var event;

        // if the last loop is still in progress leave this loop
        if (isRunning) return;

        isRunning = true;

        (function next (e) {

          // dipatch one event in queue and call the _next_ callback, which 
          // will call _process_ for the next undispatched event in queue.
          function process (event, nxt) {

            // Publish it now...
            debug('publish event...');
            self.publisher.publish(event.payload, function() {
              // ...and set the published event to dispatched.
              debug('set event to dispatched...');
              self.store.setEventToDispatched(event, function(err) {
                if (err) {
                  debug(err);
                } else {
                  debug('event set to dispatched');
                }
              });
            });

            nxt();
          }

          // serial process all events in queue
          if (!e && queue.length) {
            process(queue.shift(), next)
          } else {
            debug(e);
          }
        })();

        isRunning = false;

      }, self.options.publishingInterval);

      if (callback) callback(null);
    });
  }
};

module.exports = EventDispatcher;
