var vows = require('vows'),
    assert = require('assert');
    
var storage = require('../lib/storage/inMemory/InMemoryStorage');
fillStore(storage);

vows.describe('The InMemoryStorage').addBatch({
    'An empty InMemoryStorage': {
        topic: storage,
        
        'has a function getId': function(storage) {
            assert.isFunction(storage.getId);
        },
        
        'getId returns a string': function(storage) {
            assert.isString(storage.getId());
        },
        
        'a second id returned by getId won\'t equal the first': function(storage) {
            assert.notEqual(storage.getId(), storage.getId());
        },
        
        'can be filled with events': function(storage) {
            storage.addEvent('1', {payload: null});
            
            var evtCount = storage.getEvents('1', 0, -1).length;
            assert.equal(evtCount, 1);
        }
    },
    'An filled InMemoryStorage': {
        topic: storage,
        
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
    storage.addEvent('2', {payload: null});
    storage.addEvent('2', {payload: null});
    storage.addEvent('2', {payload: null});
    storage.addEvent('2', {payload: null});
    storage.addEvent('3', {payload: null});
    storage.addEvent('3', {payload: null});
};