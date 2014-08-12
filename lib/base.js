'use strict';

var util = require('util'),
  EventEmitter = require('events').EventEmitter,
  _ = require('lodash'),
  uuid = require('node-uuid').v4;

/**
 * Store constructor
 * @param {Object} options The options can have information like host, port, etc. [optional]
 */
function Store(options) {
  options = options || {};

  EventEmitter.call(this);
}

util.inherits(Store, EventEmitter);

function implementError (callback) {
  var err = new Error('Please implement this function!');
  if (callback) callback(err);
  throw err;
}

_.extend(Store.prototype, {

  /**
   * Initiate communication with the queue.
   * @param  {Function} callback The function, that will be called when the this action is completed. [optional]
   *                             `function(err, queue){}`
   */
  connect: implementError,

  /**
   * Terminate communication with the queue.
   * @param  {Function} callback The function, that will be called when the this action is completed. [optional]
   *                             `function(err){}`
   */
  disconnect: implementError,

  /**
   * Use this function to obtain a new id.
   * @param  {Function} callback The function, that will be called when the this action is completed.
   *                             `function(err, id){}` id is of type String.
   */
  getNewId: function (callback) {
    var id = uuid().toString();
    if (callback) callback(null, id);
  },
  
  

});

module.exports = Store;
