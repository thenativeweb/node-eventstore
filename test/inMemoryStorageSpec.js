var vows = require('vows')
  , assert = require('assert');
  
var storageName = "inMemory";

var options = {};

vows.describe('The ' + storageName + ' Storage')
.addBatch({
    'An empty  Storage': {
        topic: function () {
            require('../lib/storage/' + storageName + '/storage').createStorage(options, function(err, storage) {
                this.callback(null, storage);
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
            var id = '1';
            storage.addEvents([{'streamId': id, commitId: '10', 'payload': {event:'bla'}}], function() {
                storage.getEvents(id, 0, -1, function(err, events) {
                    assert.isArray(events);
                    assert.equal(events.length, 1);
                });
            });
        }
    }
})
.addBatch({
    'An filled  Storage': {
       topic: function() {
            require('../lib/storage/' + storageName + '/storage').createStorage(options, function(err, storage) {
                fillStore(storage, this.callback);
            }.bind(this));
        },
        
        'after a successful `fill` we get events for id 2': {
            topic: function (storage) {
                storage.getEvents('2', 0, -1, this.callback);
            },
            
            'we can assert if length is right': function (events) {
                assert.equal(events.length, 4);
            },
            
            'we can assert if sorting is right': function (events) {
                assert.equal(events[0].commitId, '0');
                assert.equal(events[1].commitId, '1');
                assert.equal(events[3].commitId, '3');
            }
        },
        
        'after a successful `fill` we get events for id 3': {
            topic: function (storage) {
                storage.getEvents('3', 0, -1, this.callback);
            },
            
            'we can assert if length is right': function (events) {
                assert.equal(events.length, 2);
            }
        },
        
        'after a successful `fill` we get events for id 2 from 1 to 3': {
            topic: function (storage) {
                storage.getEvents('2', 1, 3, this.callback);
            },
            
            'we can assert if length is right': function (events) {
                assert.equal(events.length, 2);
            }
        },
        
        'after a successful `fill` we get all undispatched events': {
            topic: function (storage) {
                storage.getUndispatchedEvents(this.callback);
            },
            
            'we can assert if length is right': function (events) {
                assert.equal(events.length, 6);
            },
            
            'we can assert if sorting is right': function (events) {
                assert.equal(events[0].commitId, '0');
                assert.equal(events[2].commitId, '2');
                assert.equal(events[5].commitId, '5');
            }
        },

        'after a successful `fill` we get a range of events searching by event id': {
            topic: function (storage) {
                storage.getEventRange({id: '2'}, 2, this.callback);
            },
            
            'we can assert if length is right': function (events) {
                assert.equal(events.length, 2);
            },
            
            'we can assert if sorting is right': function (events) {
                assert.equal(events[0].commitId, '2');
                assert.equal(events[1].commitId, '3');
            }
        },
        
        'after a successful `fill with a snapshot` we get the snapshot': {
            topic: function (storage) {
                storage.getSnapshot('3', -1, this.callback);
            },
            
            'we can assert if snapshot is right': function (snapshot) {
                assert.equal(snapshot.data, 'dataPlus');
                assert.equal(snapshot.snapshotId, '2');
                assert.equal(snapshot.streamId, '3');
                assert.equal(snapshot.revision, '2');
            }
        },
        
        'after a successful `fill with a snapshot` we get the snapshot with maxRev': {
            topic: function (storage) {
                storage.getSnapshot('3', 1, this.callback);
            },
            
            'we can assert if snapshot is right': function (snapshot) {
                assert.equal(snapshot.data, 'data');
                assert.equal(snapshot.snapshotId, '1');
                assert.equal(snapshot.streamId, '3');
                assert.equal(snapshot.revision, '1');
            }
        }
    }
}).export(module);


function fillStore(storage, callback) {
    storage.addEvents([
        {streamId: '2', streamRevision: 0, commitId: 0, commitStamp: new Date(2012, 3, 14, 8, 0, 0), payload: {id: '1', event:'blaaaaaaaaaaa'}, dispatched: false},
        {streamId: '2', streamRevision: 1, commitId: 1, commitStamp: new Date(2012, 3, 14, 9, 0, 0), payload: {id: '2', event:'blaaaaaaaaaaa'}, dispatched: false},
        {streamId: '2', streamRevision: 2, commitId: 2, commitStamp: new Date(2012, 3, 14, 10, 0, 0), payload: {id: '3', event:'blaaaaaaaaaaa'}, dispatched: false},
        {streamId: '2', streamRevision: 3, commitId: 3, commitStamp: new Date(2012, 3, 15, 8, 0, 0), payload: {id: '4', event:'blaaaaaaaaaaa'}, dispatched: false}
    ],
    function (err) {
        storage.addEvents([
            {streamId: '3', streamRevision: 0, commitId: 4, commitStamp: new Date(2012, 3, 16, 8, 0, 0), payload: {id: '5', event:'blaaaaaaaaaaa'}, dispatched: false},
            {streamId: '3', streamRevision: 1, commitId: 5, commitStamp: new Date(2012, 3, 17, 8, 0, 0), payload: {id: '6', event:'blaaaaaaaaaaa'}, dispatched: false}
            ], 
            function (err) {
                storage.addSnapshot({snapshotId: '1', streamId: '3', revision: 1, data: 'data'}, function() {
                    storage.addSnapshot({snapshotId: '2', streamId: '3', revision: 2, data: 'dataPlus'}, function() {
                        callback(null, storage);
                    });
                });
            }
        );
    });
}
