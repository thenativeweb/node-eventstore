'use strict';

var Eventstore = require('./lib/eventstore'),
  Base = require('./base');

function getSpecificStore(options) {
  options = options || {};

  if (options.prototype instanceof Base) {
    return options;
  }

  options.type = options.type || 'inmemory';

  options.type = options.type.toLowerCase();

  var dbPath = __dirname + "/databases/" + options.type + ".js";

  var exists = require('fs').existsSync || require('path').existsSync;
  if (!exists(dbPath)) {
    var errMsg = 'Implementation for db "' + options.type + '" does not exist!';
    console.log(errMsg);
    throw new Error(errMsg);
  }

  try {
    var db = require(dbPath);
    return db;
  } catch (err) {

    if (err.message.indexOf('Cannot find module') >= 0 &&
      err.message.indexOf("'") > 0 &&
      err.message.lastIndexOf("'") !== err.message.indexOf("'")) {

      var moduleName = err.message.substring(err.message.indexOf("'") + 1, err.message.lastIndexOf("'"));
      console.log('Please install module "' + moduleName +
        '" to work with db implementation "' + options.type + '"!');
    }

    throw err;
  }
}

module.exports = function(options) {
  options = options || {};

  var Store;

  try {
    Store = getSpecificStore(options);
  } catch (err) {
    if (callback) callback(err);
    throw err;
  }

  return new Eventstore(options, new Store(options));
};



//// to enable logging use https://github.com/visionmedia/debug
//
//
//// Synopsis
//
//var es = require('eventstore')({ /* connection settings */ });
//
//// if defined the eventstore will try to publish and set event do dispatched on its own...
//es.useEventPublisher(function(evt) {
//  // bus.emit('event', evt');
//});
////es.useEventPublisher(function(evt, callback) {
////  // bus.emit('event', evt');
////  callback();
////});
//
//
//// init eventstore
//
//es.init(function (err) { /* optional callback */ });
//
//// es.on('connect', function() { });
//es.on('disconnect', function() { });
//
//// es.getEventStream('streamId', 1, 4, function (err, stream) {
//es.getEventStream({ context: 'hr', aggregate: 'person', aggregateId: 'uuid' }, 1, 4, function (err, stream) {
//  
//  console.log(stream.events);
//  
//  stream.addEvent({ /* an event obj */ });
//  stream.addEvents([{ /* an event obj */ }]);
//  
//  stream.commit(function(err /*, stream */) {
//    
//  });
//  
//});
//
//// es.getFromSnapshot('streamId', function(err, snapshot, stream) {  });
//// es.getFromSnapshot('streamId', 3, function(err, snapshot, stream) {  });
//// es.getFromSnapshot({ context: 'hr', aggregate: 'person', aggregateId: 'uuid' }, 3, function(err, snapshot, stream) {  });
//es.getFromSnapshot({ context: 'hr', aggregate: 'person', aggregateId: 'uuid' }, function(err, snapshot, stream) {
//  var snap = snapshot.data;
//  var history = stream.events; // events history from given snapshot
//
//  // myAggregate.loadSnapshot(snap);
//  // myAggregate.loadFromHistory(history);
//  
//  // create a new snapshot depending on your rules
//  if (history.length > myRange) {
//    // es.createSnapshot({
//    //   streamId: 'streamId',
//    //   data: {},
//    //   revision: stream.currentRevision()//,
//    //   // version: snapshotVersion
//    // }, function(err) { });
//    es.createSnapshot({
//      context: 'hr',
//      aggregate: 'person',
//      aggregateId: 'uuid',
//      data: {},
//      revision: stream.currentRevision()//,
//      // version: snapshotVersion
//    }, function(err) { });
//  }
//
//  // go on: store new event and commit it
//  
//  // stream.addEvents...
//
//});
//
//
//
//// skip, limit always optional
//
//es.getEvents(0, 100, function(err, evts) {
//  // if (events.length === amount) {
//  //   events.next(handle);
//  // } else {
//  // }
//});
//
//es.getEvents('streamId', 0, 100, function(err, evts) {
//  // if (events.length === amount) {
//  //   events.next(handle);
//  // } else {
//  // }
//});
//
//es.getEvents({ // free choice [all, only context, only aggregate, only id..]
//  context: 'hr',
//  aggregate: 'person',
//  aggregateId: 'uuid'
//}, 0, 100, function(err, evts) {
//  // if (events.length === amount) {
//  //   events.next(handle);
//  // } else {
//  // }
//});
//
//
//es.getUndispatchedEvents(function(err, evts) {
//
//  // all undispatched events
//  console.log(evts);
//
//  // dispatch it and set the event as dispatched
//  es.setEventToDispatched(evts[0], function(err) {});
//
//});
//
//es.getNewId(function(err, id) {  });
