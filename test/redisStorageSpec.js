var vows = require('vows')
  , assert = require('assert');

vows.describe('The redis Storage')
.addBatch({
    'An empty redis storage': {
        topic: function () {
            require('../lib/storage/redis/storage').createStorage(function(storage) {
                this.callback(null, storage);
            }.bind(this));
        },
        
        'has a function getId': function(storage) {
            assert.isFunction(storage.getId);
        },
        
        'getId returns a string': function(storage) {
            storage.getId(function(id) {
                assert.isString(id);
            });
        },
        
        'a second id returned by getId won\'t equal the first': function(storage) {
            storage.getId(function(id1) {
                storage.getId(function(id2) {
                    assert.notEqual(id1, id2);
                });
            });
        },
        
        'can be filled with events': function(storage) {
            var id = "1";
            storage.addEvent({'streamId': id, 'payload': {event:'bla'}}, function() {
                storage.getEvents(id, 0, -1, function(events) {
                    var evtCount = events.length;
                    assert.equal(evtCount, 1);
                });
            });
        }
    }
})
.addBatch({
    'An filled redis storage': {
       topic: function() {
            require('../lib/storage/redis/storage').createStorage(function(storage) {
                this.callback(null, fillStore(storage));
            }.bind(this));
        },
        
        'can provide requested events': function(storage) {
            storage.getEvents('2', 0, -1, function(events) {
                var evtCount1 = events.length;
                assert.equal(evtCount1, 4);
            });
            
            storage.getEvents('3', 0, -1, function(events) {
                var evtCount2 = events.length;
                assert.equal(evtCount2, 2);
            });
        },
        'can provide events from minRevision to maxRevision': function(storage) {
            storage.getEvents('2', 1, 3, function(events) {
                var evtCount = events.length;
                assert.equal(evtCount, 2);
            });            
        }
    }
}).export(module);


function fillStore(storage) {
    storage.addEvent({streamId: '2', payload: null}, function(){});
    storage.addEvent({streamId: '2', payload: null}, function(){});
    storage.addEvent({streamId: '2', payload: null}, function(){});
    storage.addEvent({streamId: '2', payload: null}, function(){});
    storage.addEvent({streamId: '3', payload: null}, function(){});
    storage.addEvent({streamId: '3', payload: null}, function(){});
    
    return storage;
}