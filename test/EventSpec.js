var vows = require('vows'),
    assert = require('assert');
    
var es = require('../lib/EventStore'),
    event = es.Event;

vows.describe('The Event Object').addBatch({
    'An event': {
        topic: new(event),
        
        'has property streamId = null': function(evt) {
            assert.equal(evt.streamId, null);
        }
    }
}).export(module);