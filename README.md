# Introduction

[![Build Status](https://secure.travis-ci.org/KABA-CCEAC/nodeEventStore.png)](http://travis-ci.org/KABA-CCEAC/nodeEventStore)

The project goal is to provide an eventstore implementation for node.js:

- load and store events via EventStream object
- event dispatching to your publisher
- supported Dbs (MongoDb, Redis, TingoDb)
- snapshot support

# Installation

	npm install eventstore

choose one of the existing storage implementation or provide your own:

	// for mongoDb
	npm install eventstore.mongodb

	// for redis
	npm install eventstore.redis

	// for tingoDb
	npm install eventstore.tingodb

# Usage

### Require the module and init the eventstore:

	var eventstore = require('eventstore');

	var es = eventstore.createStore(); // optional pass in your options
                                     // to disable forking of event dispatching set forkDispatching to false
                                     // to disable complete event dispatching set enableDispatching to false

By default the eventstore will use an inMemory Storage, a fakePublisher and no logger.

To use the provided console.logger you could create the eventstore 
with option `eventstore.createStore({logger: 'console'});`.

### Provide implementation for storage and publishing events

Example will use redis storage, but same will work for mongoDb.

	var storage = require('eventstore.redis');

	storage.createStorage(function(err, store) {
	    es.configure(function() {
	        es.use(store);
	        es.use(publisher); // your publisher must provide function 'publisher.publish(event)'
	        // es.use(logger);
	    });

	    // start eventstore
	    es.start();
	});
	
	// Mongodb storage
	storage.createStorage({
      host: 'localhost',
      port: 27017,
      dbName: 'eventstore',
      eventsCollectionName: 'events',
      snapshotsCollectionName: 'snapshots'
	},function(err, store) {
	    es.configure(function() {
	        es.use(store);
	        es.use(publisher); // your publisher must provide function 'publisher.publish(event)'
	        // es.use(logger);
	    });

	    // start eventstore
	    es.start();
	});

### Work with the eventstore

get the eventhistory of an aggregate

    es.getEventStream(aggregateId, 0, function(err, stream) {                    
      var history = stream.events; // the original event will be in events[i].payload

      // myAggregate.loadFromHistory(history);
    });

store a new event and commit it to store

    es.getEventStream(aggregateId, 0, function(err, stream) {                    
      stream.addEvent(new event);
      stream.commit();
    });

the committed event will be dispatched to the provided publisher

### Work with snapshotting

get snapshot and eventhistory from the snapshot point

	es.getFromSnapshot(aggregateId, function(err, snapshot, stream) {
		
		var snap = snapshot.data;
		var history = stream.events; // events history from given snapshot

		myAggregate.loadSnapshot(snap);
		myAggregate.loadFromHistory(history);

	});

create a snapshot point

	es.getFromSnapshot(aggregateId, function(err, snapshot, stream) {
		
		var snap = snapshot.data;
		var history = stream.events; // events history from given snapshot

		myAggregate.loadSnapshot(snap);
		myAggregate.loadFromHistory(history);

		// create a new snapshot depending on your rules
		if (history.length > myRange) {
			es.createSnapshot(aggregateId, stream.currentRevision(), myAggregate.getSnap()[, snapshotVersion]);
		}

		// go on: store new event and commit it

	});

### Replaying events

If you want to replay all events from the store you can do it with the function getAllEvents:

	var handle = function(err, events) {
	  // events is the eventstream
	  if (events.length === amount) {
	    events.next(handle);
	  } else {
	    // finished to replay
	  }
	};

	es.getAllEvents(0, 100, handle);

or with the function getEventRange:

	var match = {} // match query in inner event (payload), for example: { id: eventId }
                   // if {} all events will return
      , amount = 20; // amount of events to receive per request

	var handle = function(err, events) {
	  // events is the eventstream
	  if (events.length === amount) {
	    events.next(handle);
	  } else {
	    // finished to replay
	  }
	};

	es.getEventRange(match, amount, handle);

If you want to replay all events of a particular aggregate or stream you can do it with the function getEvents:

	var streamId = '1234'
	  , revMin = null  // optional, must be a number
	  , revMax = null; // optional, must be a number

	es.getEvents(streamId, revMin, revMax, function(err, events) {
	  // events is the eventstream
	});


### own event dispatching

	es.getUndispatchedEvents(function(err, evts) {
		
		// all undispatched events
		console.log(evts);

		// dispatch it and set the event as dispatched
		es.setEventToDispatched(evts[0], function(err) {});

	});


# Sample Integration

- [nodeCQRS](https://github.com/jamuhl/nodeCQRS) A CQRS sample integrating eventstore

# Inspiration

- Jonathan Oliver's [EventStore](https://github.com/joliver/EventStore) for .net.

# License

Copyright (c) 2014 Adriano Raiano, Jan Muehlemann

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


