'use strict';

var util = require('util'),
  Store = require('../base'),
  _ = require('lodash'),
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
  }

});

module.exports = InMemory;
