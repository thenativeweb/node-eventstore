var vows = require('vows')
  , assert = require('assert')
  , eventstore = require('../lib/eventStore').createStore();
 
eventstore.start();
 
vows.describe('The EventStore')
.addBatch({
    'An unconfigured eventstore does not throw error when': {
        topic: eventstore,
        
        'requesting an eventstream': function(es) {
            assert.doesNotThrow(function() {es.getEventStream('1', 0, -1, function (error, es) {});});
        },
        
        'committing': function(es) {
            assert.doesNotThrow(function() {es.commit({currentRevision: function() {return 0;}, events: [], uncommittedEvents: []});}, this.callback);
        }
    }
})
.addBatch({    
    'A configured eventstore': {
        topic: function() {
            require('../lib/storage/inMemory/storage').createStorage(function(err, storage) {
                eventstore.configure(function() {
                    // configure eventstore
                    eventstore.use(storage);
                    this.callback(null, eventstore);
                }.bind(this));
            }.bind(this));
        },
                
        'can commit a single event': {
            topic: function() {
                eventstore.commit({currentRevision: function() {return 0;}, events: [],uncommittedEvents:[{streamId: 'e1', payload: {event:'bla'}}]}, this.callback);
            },
            
            'and can commit an additional array of events': {
                topic: function() {
                    eventstore.commit({currentRevision: function() {return 0;},events: [],uncommittedEvents:[{streamId: 'e1', payload: {event:'bla'}}, {streamId: 'e1', payload: {event:'bla'}}]}, this.callback);
                },
                
                'and can request it`s full eventstream': {
                    topic: function() {
                        eventstore.getEventStream('e1', 0, -1, this.callback);
                    },
                    
                    'correctly': function(err, stream) {
                        assert.equal(stream.events.length, 3);
                    },
                    
                    'the eventstream has no uncommitted events': function(err, stream) {
                        assert.equal(stream.uncommittedEvents.length, 0);
                    }
                }
            }
        },
        
        'can work with eventstream': {
            topic: function() {
                eventstore.getEventStream('e2', 0, -1, this.callback);
            },
            
            'so to add events to the stream': function(err, stream) {
                 stream.addEvent({streamId: 'e2', payload: null});
            },
            
            'and commit it': function(err, stream) {
                stream.commit();
            }
        },
        
        'can work with snapshots': {
            topic: function() {
                eventstore.getEventStream('e3', 0, -1, function(err, stream) {
                    stream.addEvent({streamId: 'e3', payload: null});
                    stream.commit(function(err) {
                        eventstore.getEventStream('e3', 0, -1, this.callback);
                    }.bind(this));
                }.bind(this));
            },
            
            'so create a snapshot from eventstream': {
                topic: function(stream) {
                    assert.equal(stream.currentRevision(), 0);
                    assert.equal(stream.currentRevision(), stream.lastRevision);
                    eventstore.createSnapshot(stream.streamId, stream.currentRevision(), 'data', this.callback);
                },
            
                'and request it': {
                    topic: function(err) {
                        eventstore.getFromSnapshot('e3', this.callback);
                    },
                    
                    'correctly': function(err, snapshot, stream) {
                        assert.equal(snapshot.data, 'data');
                        assert.equal(snapshot.streamId, 'e3');
                        assert.equal(stream.currentRevision(), 0);
                        assert.equal(snapshot.revision, stream.lastRevision);
                        assert.equal(snapshot.revision, stream.currentRevision());
                    }
                }
            }
        }
    }
}).export(module);
