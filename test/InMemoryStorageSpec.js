var vows = require('vows'),
    assert = require('assert');
    
var storage = require('../lib/storage/inMemory/InMemoryStorage');

vows.describe('The InMemoryStorage').addBatch({
    'An InMemoryStorage': {
        topic: storage,
        
        'has a function getId': function(storage) {
            assert.isFunction(storage.getId);
        },
        
        'getId returns a string': function(storage) {
            assert.isString(storage.getId());
        },
        
        'a second id returned by getId won\'t equal the first': function(storage) {
            assert.notEqual(storage.getId(), storage.getId());
        }
    }
}).export(module);