var vows = require('vows')
  , assert = require('assert')
  , eventstore = require('../lib/EventStore').createStore()
  , storage = require('../lib/storage/inMemory/InMemoryStorage').createStorage()
  , event = eventstore.Event;

vows.describe('The EventStore')
.addBatch({
    'An unconfigured eventstore': {
        topic: eventstore,
        
        'throws error when requesting an eventstream': function(es) {
            assert.throws(function() {es.getEventStream('1', 0, -1)}, /Configure/);
        },
        
        'throws error when committing': function(es) {
            assert.throws(function() {es.commit([])}, /Configure/);
        }
    }
})
.addBatch({    
    'but when configured to use a storage implementation': {
        topic: function() {
            return eventstore.configure(function() {
                eventstore.use(storage);
            });
        },
        
        'requesting and eventstream won`t throw': function(es) {
             assert.doesNotThrow(function() {es.getEventStream('1', 0, -1, function(err, stream){})}, /Configure/);
        },
        
        'committing won`t throw': function(es) {
            assert.doesNotThrow(function() {es.commit({events: [], uncommittedEvents: []})}, /Configure/);
        }
    }
})
.addBatch({
    'when committed an single event': {
        topic: function() {
            eventstore.commit({events: [],uncommittedEvents:[{streamId: 'e1', payload: null}]});
            return eventstore;
        },
        
        'you can commit an additional array of events': function(es) {
            eventstore.commit({events: [],uncommittedEvents:[{streamId: 'e1', payload: null}, {streamId: 'e1', payload: null}]});
        },
        
        'and request it`s full eventstream': {
            topic: function(es) {
                es.getEventStream('e1', 0, -1, this.callback);
            },
            
            'you get the eventstream async': function(err, stream) {
                assert.equal(stream.events.length, 3);
            }
        }
    }
})
.addBatch({
    'or i can work with eventstream': {
        topic: function() {
            var stream = eventstore.getEventStream('e1', 0, -1, this.callback);
        },
        
        'you can add events to the stream': function(err, stream) {
             stream.addEvent({streamId: 'e1', payload: null});
        },
        
        'and commit it': function(err, stream) {
            stream.commit();
        }
    }
}).export(module);