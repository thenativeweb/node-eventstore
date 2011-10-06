var vows = require('vows')
  , assert = require('assert');

vows.describe('The InMemoryStorage')
.addBatch({
    'An empty InMemoryStorage': {
        topic: function () {
            require('../lib/storage/inMemory/storage').createStorage(function(storage) {
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
            storage.addEvent({streamId: '1', payload: null}, function() {
                var evtCount = storage.getEvents('1', 0, -1).length;
                assert.equal(evtCount, 1);
            });
        }
    }
})
.addBatch({
    'An filled InMemoryStorage': {
       topic: function() {
            require('../lib/storage/inMemory/storage').createStorage(function(storage) {
                this.callback(null, fillStore(storage));
            }.bind(this));
        },
        
        'can provide requested events': function(storage) {
            var evtCount1 = storage.getEvents('2', 0, -1).length;
            assert.equal(evtCount1, 4);
            
            var evtCount2 = storage.getEvents('3', 0, -1).length;
            assert.equal(evtCount2, 2);
        },
        'can provide events from minRevision to maxRevision': function(storage) {
            var evtCount = storage.getEvents('2', 1, 3).length;
            assert.equal(evtCount, 2);
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