# Introduction

The project goal is to provide an eventstore implementation for node.js:

- load and store events via EventStream object
- event dispatching to your publisher
- supported Dbs (MongoDb, CouchDb, Redis)
- snapshot support

# Installation

    npm install eventstore

choose one of the existing storage implementation or provide your own:

    // for mongoDb
    npm install eventstore.mongoDb

    // for couchDb
    npm install eventstore.couchDb

    // for redis
    npm install eventstore.redis

# Usage

### Require the module and init the eventstore:

    var eventstore = require('eventstore');

    var es = eventstore.createStore(); // optional pass in your options

By default the eventstore will use an inMemory Storage, a fakePublisher and no logger.

To use the provided console.logger you could create the eventstore 
with option `eventstore.createStore({logger: 'console'});`.

### Provide implementation for storage and publishing events

Example will use redis storage, but same will work for mongoDb and couchDb.

  require storage = require('eventstore.redis');

    storage.createStorage(function(err, store) {
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
          es.createSnapshot(aggregateId, stream.currentRevision(), myAggregate.getSnap());
        }

        // go on: store new event and commit it

    });

# Sample Integration

- [nodeCQRS](https://github.com/jamuhl/nodeCQRS) A CQRS sample integrating eventstore

# Annotated Code

You can find the code documentation [here](public/docs/eventStore.html).

# Inspiration

- Jonathan Oliver's [EventStore](https://github.com/joliver/EventStore) for .net.

## Release Notes

### v0.3.0

- eventstreams
- snapshoting
- get all events with paging for replay
- console.logger
- db implementations for mongoDb, couchDb, redis