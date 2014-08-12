'use strict';

module.exports = require('./lib/eventstore');


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
//    // es.createSnapshot('streamId', stream.currentRevision(), myAggregate.getSnap()/*[, snapshotVersion]*/, function(err) { });
//    // es.createSnapshot({ context: 'hr', aggregate: 'person', aggregateId: 'uuid' }, stream.currentRevision(), myAggregate.getSnap()/*[, snapshotVersion]*/, function(err) { });
//    es.createSnapshot({
//      context: 'hr',
//      aggregate: 'person',
//      aggregateId: 'uuid',
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
