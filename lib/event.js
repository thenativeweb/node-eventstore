'use strict';

var debug = require('debug')('eventstore:event');

/**
 * Event constructor
 * @param {EventStream} eventstream the corresponding event stream object
 * @param {Object}      event       the event object
 * @constructor
 */
function Event (eventstream, event) {
  if (!eventstream) {
    var errStreamMsg = 'eventstream not injected!';
    debug(errStreamMsg);
    throw new Error(errStreamMsg);
  }
  if (!event) {
    var errEvtMsg = 'event not injected!';
    debug(errEvtMsg);
    throw new Error(errEvtMsg);
  }

  if (!eventstream.aggregateId) {
    var errAggIdMsg = 'eventstream.aggregateId not injected!';
    debug(errAggIdMsg);
    throw new Error(errAggIdMsg);
  }

  if (!eventstream.streamId) {
    var errStrIdMsg = 'eventstream.streamId not injected!';
    debug(errStrIdMsg);
    throw new Error(errStrIdMsg);
  }

  this.streamId = eventstream.streamId;
  this.aggregateId = eventstream.aggregateId;
  this.aggregate = eventstream.aggregate;
  this.context = eventstream.context;
  this.streamRevision = null;
  this.commitId = null;
  this.commitSequence = null;
  this.commitStamp = null;
  this.header = null;
  this.dispatched = false;
  this.payload = event || null;

  eventstream.uncommittedEvents.push(this);
}

module.exports = Event;
