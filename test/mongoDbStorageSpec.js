var vows = require('vows')
  , assert = require('assert');
  
var options = {
    collectionName: 'testevents',
    dbName: 'testeventstore'
}

var storageName = "mongoDb";

vows.describe('The ' + storageName + ' Storage')
.addBatch({
    'An empty  Storage': {
        topic: function () {
            require('../lib/storage/' + storageName + '/storage').createStorage(options, function(err, storage) {
                storage._clear(function() {
                    this.callback(null, storage);
                }.bind(this));
            }.bind(this));
        },
        
        'has a function getId': function(storage) {
            assert.isFunction(storage.getId);
        },
        
        'getId returns a string': function(storage) {
            storage.getId(function(err, id) {
                assert.isString(id);
            });
        },
        
        'a second id returned by getId won\'t equal the first': function(storage) {
            storage.getId(function(err, id1) {
                storage.getId(function(err, id2) {
                    assert.notEqual(id1, id2);
                });
            });
        },
        
        'can be filled with events': function(storage) {
            var id = "1";
            storage.addEvent({'streamId': id, 'streamRevision': 0, 'payload': {event:'bla'}}, function() {
                storage.getEvents(id, 0, -1, function(err, events) {
                    assert.length(events, 1);
                });
            });
        }
    }
})
.addBatch({
    'An filled  Storage': {
       topic: function() {
            require('../lib/storage/' + storageName + '/storage').createStorage(options, function(err, storage) {
                storage._clear(function() {
                    fillStore(storage, function(storage) {
                        this.callback(null, storage);
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        },
        
        'after a successful `fill` we get events for id 2': {
            topic: function (storage) {
                storage.getEvents('2', 0, -1, function(err, events) {
                    this.callback(null, events);
                }.bind(this));
            },
            
            'we can assert if length is right': function (events) {
                assert.length(events, 4);
            }
        },
        
        'after a successful `fill` we get events for id 3': {
            topic: function (storage) {
                storage.getEvents('3', 0, -1, function(err, events) {
                    this.callback(null, events);
                }.bind(this));
            },
            
            'we can assert if length is right': function (events) {
                assert.length(events, 2);
            }
        },
        
        'after a successful `fill` we get events for id 2 from 1 to 3': {
            topic: function (storage) {
                storage.getEvents('2', 1, 3, function(err, events) {
                    this.callback(null, events);
                }.bind(this));
            },
            
            'we can assert if length is right': function (events) {
                assert.length(events, 2);
            }
        },
        
        'after a successful `fill` we get all undispatched events': {
            topic: function (storage) {
                storage.getUndispatchedEvents(function(err, events) {
                    this.callback(null, events);
                }.bind(this));
            },
            
            'we can assert if length is right': function (events) {
                assert.length(events, 6);
            }
        },
        
        'after a successful `fill with a snapshot` we get the snapshot': {
            topic: function (storage) {
                storage.getSnapshot('3', -1, function(err, snapshot) {
                    this.callback(null, snapshot);
                }.bind(this));
            },
            
            'we can assert if snapshot is right': function (snapshot) {
                assert.equal(snapshot.data, 'data');
                assert.equal(snapshot.id, '1');
                assert.equal(snapshot.streamId, '3');
                assert.equal(snapshot.revision, '1');
            }
        }
    }
}).export(module);


function fillStore(storage, callback) {
    storage.addEvent({streamId: '2', streamRevision: 0, commitId: 0, payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
        storage.addEvent({streamId: '2', streamRevision: 1, commitId: 1, payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
            storage.addEvent({streamId: '2', streamRevision: 2, commitId: 2, payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
                storage.addEvent({streamId: '2', streamRevision: 3, commitId: 3, payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
                    storage.addEvent({streamId: '3', streamRevision: 0, commitId: 4, payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
                        storage.addEvent({streamId: '3', streamRevision: 1, commitId: 5, payload: {event:'blaaaaaaaaaaa'}, dispatched: false}, function(){
                            storage.addSnapshot({id: '1', streamId: '3', revision: 1, data: 'data'}, function(){
                                callback(storage);
                            });
                        });
                    });
                });
            });
        });
    });
}
