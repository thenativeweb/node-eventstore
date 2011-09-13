var vows = require('vows'),
    assert = require('assert');
    
var es = require('../lib/EventStore'),
    stream = es.getEventStream('0', 0, -1);



vows.describe('The EventStream Object').addBatch({
    'An EventStream': {
        topic: stream,
        
        'with 1 event': function(stream) {
            assert.equal(stream.events.length, 1);
        },
        
        'with 0 uncommitted events': function(stream) {
            assert.equal(stream.uncommittedEvents.length, 0);
        },
        
        'can commit to store': function(stream) {
            assert.isTrue(stream.commit());
        }
    }
}).export(module);