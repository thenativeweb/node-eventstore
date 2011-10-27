var vows = require('vows')
  , assert = require('assert')
  , eventstore = require('../lib/eventStore').createStore();
 
vows.describe('The EventStore')
.addBatch({
    'An unconfigured eventstore': {
        topic: eventstore,
        
        'does not throw error when requesting an eventstream': function(es) {
            assert.doesNotThrow(function() {es.getEventStream('1', 0, -1, function (error, es) {})});
        },
        
        'but returns an error in the callback': function(es) {
            es.getEventStream('1', 0, -1, function (error, es) {
                assert.include(error.toString(), 'Configure');
            });
        },
        
        'does not throw error when committing': function(es) {
            assert.doesNotThrow(function() {es.commit([])});
        }
    }
})
.addBatch({    
    'but when configured to use a storage implementation': {
        topic: function() {
            require('../lib/storage/inMemory/storage').createStorage(function(err, storage) {
                eventstore.configure(function() {
                    // configure eventstore
                    eventstore.use(storage);
                    this.callback(null, eventstore);
                }.bind(this));
            }.bind(this));
        },
        
        'requesting and eventstream won`t throw': function(es) {
             assert.doesNotThrow(function() {es.getEventStream('1', 0, -1, function(err, stream){})}, /Configure/);
        },
        
        'committing won`t throw': function(es) {
            assert.doesNotThrow(function() {es.commit({currentRevision: function() {return 0;}, events: [], uncommittedEvents: []})}, /Configure/);
        }
    }
})
.addBatch({
    'when committed an single event': {
        topic: function() {
            eventstore.commit({currentRevision: function() {return 0;}, events: [],uncommittedEvents:[{streamId: 'e1', payload: {event:'bla'}}]});
            return eventstore;
        },
        
        'you can commit an additional array of events': function(es) {
            es.commit({currentRevision: function() {return 0;},events: [],uncommittedEvents:[{streamId: 'e1', payload: {event:'bla'}}, {streamId: 'e1', payload: {event:'bla'}}]});
        },
        
        'and request it`s full eventstream': {
            topic: function(es) {
                es.getEventStream('e1', 0, -1, this.callback);
            },
            
            'you get the eventstream async': function(err, stream) {
                assert.equal(stream.events.length, 0);
            }
        }
    }
})
.addBatch({
    'or i can work with eventstream': {
        topic: function() {
            eventstore.getEventStream('e1', 0, -1, this.callback);
        },
        
        'you can add events to the stream': function(err, stream) {
             stream.addEvent({streamId: 'e1', payload: null});
        },
        
        'and commit it': function(err, stream) {
            stream.commit();
        }
    }
})
.addBatch({
    'when creating a snapshot': {
        topic: function() {
            eventstore.getEventStream('e1', 0, -1, this.callback);
        },
        
        'you can request it': {
            topic: function(stream) {
                stream.createSnapshot('data', this.callback);
            },
        
            'you can request it': {
                topic: function(err) {
                    eventstore.getFromSnapshot('e1', -1, this.callback);
                },
                
                'you get the snapshot async': function(err, snapshot, stream) {
                    assert.equal(snapshot.data, 'data');
                    assert.equal(snapshot.streamId, 'e1');
                }
            }
        }
    }
}).export(module);
