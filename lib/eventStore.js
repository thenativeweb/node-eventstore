'use strict';

var debug = require('debug')('eventstore'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  _ = require('lodash'),
  tolerate = require('tolerance');

/**
 * Eventstore constructor
 * @param {Object} options The options.
 * @param {Store} store    The db implementation.
 * @constructor
 */
function Eventstore(options, store) {
  this.options = options || {};
  this.store = store;

  EventEmitter.call(this);
}

util.inherits(Eventstore, EventEmitter);


_.extend(Store.prototype, {

  /**
   * Inject function for event publishing.
   * @param {Function} fn the function to be injected
   * @returns {Store}  to be able to chain...
   */
  useEventPublisher: function (fn) {
    if (fn.length === 1) {
      fn = _.wrap(fn, function(func, callback) {
        func();
        callback(null);
      });
    }

    this.publisher = fn;

    return this;
  },

  /**
   * Call this function to initialize the eventstore.
   * If an event publisher function was injected it will additionally initialize an event dispatcher.
   * @param callback the function that will be called when this action has finished
   */
  init: function (callback) {
    var self = this;

    function initDispatcher() {
      debug('init event dispatcher');
      self.dispatcher = new EventDispatcher(self.options, self.publisher, self.store);
      self.dispatcher.start(callback);
    }
    
    this.store.on('connect', function () {
      self.emit('connect', self);
    });

    this.store.on('disconnect', function () {
      self.emit('disconnect', self);
    });
    
    process.nextTick(function() {
      tolerate(function(callback) {
        self.store.connect(callback);
      }, self.options.timeout || 0, function (err) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }
        if (!self.publisher) {
          debug('no publisher defined');
          if (callback) callback(null);
          return;
        }
        initDispatcher();
      });
    });
  },

  getEventStream: function (query, revMin, revMax, callback) {
    if (typeof revMin === 'function') {
      callback = revMin;
      revMin = 0;
      revMax = -1;
    } else if (typeof revMax === 'function') {
      callback = revMax;
      revMax = -1;
    }

    if (typeof query === 'string') {
      query = { aggregateId: query };
    }
    
    // etc...
  }

});

module.exports = Eventstore;
