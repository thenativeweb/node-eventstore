'use strict';

var util = require('util'),
  Store = require('../base'),
  _ = require('lodash'),
  debug = require('debug')('eventstore:store:inmemory'),
  store = {};

function InMemory(options) {
  Store.call(this, options);
}

util.inherits(InMemory, Store);

_.extend(InMemory.prototype, {

  connect: function (callback) {
    this.emit('connect');
    if (callback) callback(null, this);
  },

  disconnect: function (callback) {
    this.emit('disconnect');
    if (callback) callback(null);
  },
  
  clear: function (callback) {
    store = {};
    if (callback) callback(null);
  },

  addEvents: function (events, callback) {
    if (!events || events.length === 0) {
      callback(null);
      return;
    }
    
    var found = _.find(events, function(evt) {
      return !evt.aggregateId;
    });
    
    if (found) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
    }

    var aggregateId = events[0].aggregateId;
    var aggregate = events[0].aggregate || '_general';
    var context = events[0].context || '_general';

    store[context] = store[context] || {};
    store[context][aggregate] = store[context][aggregate] || {};

    store[context][aggregate][aggregateId] = store[context][aggregate][aggregateId] || [];

    store[context][aggregate][aggregateId] = store[context][aggregate][aggregateId].concat(events);
    callback(null);
  },

  getEvents: function (query, skip, limit, callback) {
    var res = [];
    for (var s in store) {
      for (var ss in store[s]) {
        for (var sss in store[s][ss]) {
          res = res.concat(store[s][ss][sss]);
        }
      }
    }
    if (limit === -1) {
      return callback(null, res.slice(skip));
    }

    callback(null, res.slice(skip, skip + limit));
  }

});

module.exports = InMemory;
