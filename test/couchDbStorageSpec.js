var vows = require('vows')
  , assert = require('assert');
  
var options = {
    collectionName: 'testevents'
}

var storageName = "couchDb";

vows.describe('The ' + storageName + ' Storage')
.addBatch({
    'An empty  Storage': {
        topic: function () {
            require('../lib/storage/' + storageName + '/storage').createStorage(options, function(storage) {
                storage._clear(function() {
                    this.callback(null, storage);
                }.bind(this));
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
                    assert.length(events, 1);
                });
            });
        }
    }
})
.addBatch({
    'An filled  Storage': {
       topic: function() {
            require('../lib/storage/' + storageName + '/storage').createStorage(options, function(storage) {
                storage._clear(function() {
                    fillStore(storage, function(storage) {
                        this.callback(null, storage);
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        },
        
        'after a successful `fill` we get events for id 2': {
            topic: function (storage) {
                storage.getEvents('2', 0, -1, function(events) {
                    this.callback(null, events);
                }.bind(this));
            },
            
            'we can assert if length is right': function (events) {
                assert.length(events, 4);
            }
        },
        
        'after a successful `fill` we get events for id 3': {
            topic: function (storage) {
                storage.getEvents('3', 0, -1, function(events) {
                    this.callback(null, events);
                }.bind(this));
            },
            
            'we can assert if length is right': function (events) {
                assert.length(events, 2);
            }
        },
        
        'after a successful `fill` we get events for id 2 from 1 to 3': {
            topic: function (storage) {
                storage.getEvents('2', 1, 3, function(events) {
                    this.callback(null, events);
                }.bind(this));
            },
            
            'we can assert if length is right': function (events) {
                assert.length(events, 2);
            }
        },
        
        'after a successful `fill` we get all undispatched events': {
            topic: function (storage) {
                storage.getUndispatchedEvents(function(events) {
                    this.callback(null, events);
                }.bind(this));
            },
            
            'we can assert if length is right': function (events) {
                assert.length(events, 6);
            }
        }
    }
}).export(module);


function fillStore(storage, callback) {
    storage.addEvent({streamId: '2', payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
        storage.addEvent({streamId: '2', payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
            storage.addEvent({streamId: '2', payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
                storage.addEvent({streamId: '2', payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
                    storage.addEvent({streamId: '3', payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
                        storage.addEvent({streamId: '3', payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
                            callback(storage);
                        });
                    });
                });
            });
        });
    });
}