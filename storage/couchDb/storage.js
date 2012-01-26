//     storage.js v0.3.0
//     (c) 2012 Kaba AG, MIC AWM; under MIT License
//     (by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// The storage is the database driver for couchDb.
//
// __Example:__
//
//      require('[pathToStorage]/storage').createStorage({}, function(err, storage) {
//          ...
//      });

var cradle = require('cradle')
  , root = this
  , couchDbStorage
  , Storage;

if (typeof exports !== 'undefined') {
    couchDbStorage = exports;
} else {
    couchDbStorage = root.couchDbStorage = {};
}

couchDbStorage.VERSION = '0.3.0';

// Create new instance of storage.
couchDbStorage.createStorage = function(options, callback) {
    new Storage(options, callback);
};


// ## CouchDb storage
Storage = function(options, callback) {
    if (typeof options === 'function')
        callback = options;
        
    var defaults = {
        host: 'localhost',
        port: 5984,
        dbName: 'eventstore',
        eventsCollectionName: 'events',
        snapshotsCollectionName: 'snapshots'
    };
    
    this.options = mergeOptions(options, defaults);
    
    this.store = new(cradle.Connection)();
    this.client = this.store.database(this.options.dbName);
    this.client.exists(function(err, res) {
        if (err) {
			callback(err);
		}
		else if (res === false) {
            this.client.create(function(err) {
                if (err) {
                    callback(err);
                }
                else {
                    this.client.save('_design/'+this.options.dbName, {
                        eventsByStreamId: {
                            map: function (evt) {
                                if (!evt.snapshotId) {
                                    emit(evt.streamId, evt);
                                }
                            }
                        },
                        allUndispatched: {
                            map: function (evt) {
                                if (!evt.snapshotId && !evt.dispatched) {
                                    emit(evt._id, evt);
                                }
                            }
                        },
                        snapshotsByStreamId: {
                            map: function (snapshot) {
                                if (snapshot.snapshotId) {
                                    emit(snapshot.streamId, snapshot);
                                }
                            }
                        },
                        allEvents: {
                            map: function (evt) {
                                if (!evt.snapshotId) {
                                    emit(evt._id, evt);
                                }
                            }
                        }
                    });
                    callback(null, this);
                }
            }.bind(this));
        }
        else {
            callback(null, this);
        }
    }.bind(this));
};

Storage.prototype = {

    // __addEvents:__ saves all events.
    //
    // `storage.addEvents(events, callback)`
    //
    // - __events:__ the events array
    // - __callback:__ `function(err){}`
    addEvents: function(events, callback) {
        for(var i in events) {
            events[i]._id = events[i].commitId;
        }
        this.client.save(events, callback);
    },

    // __addSnapshot:__ stores the snapshot
    // 
    // `storage.addSnapshot(snapshot, callback)`
    //
    // - __snapshot:__ the snaphot to store
    // - __callback:__ `function(err){}` [optional]
    addSnapshot: function(snapshot, callback) {
        snapshot._id = snapshot.snapshotId;
        this.client.save(snapshot, callback);
    },

    // __getEvents:__ loads the events from _minRev_ to _maxRev_.
    // 
    // `storage.getEvents(streamId, minRev, maxRev, callback)`
    //
    // - __streamId:__ id for requested stream
    // - __minRev:__ revision startpoint
    // - __maxRev:__ revision endpoint (hint: -1 = to end) [optional]
    // - __callback:__ `function(err, snapshot, eventStream){}`
    getEvents: function(streamId, minRev, maxRev, callback) {
        
        if (typeof maxRev === 'function') {
            callback = maxRev;
            maxRev = -1;
        }
        
        this.client.view(this.options.dbName+'/eventsByStreamId', { key: streamId }, 
            function(err, res) {
                if(!err) {
                    var result = [];
                    for (var i in res) {
                        result.push(res[i].value);
                    }
                    if (result.length === 0) {
                        callback(null, []);
                    } else {
                        if (maxRev === -1) {
                            callback(null, result.slice(minRev));
                        }
                        else {
                            callback(null, result.slice(minRev, maxRev));
                        }
                    }
                }
                else {
                    callback(err);
                }
            }
        );
    },

    // __getAllEvents:__ loads the events.
    //
    // __warning:__ don't use this in production!!!
    // 
    // `storage.getAllEvents(callback)`
    //
    // - __callback:__ `function(err, events){}`
    getAllEvents: function(callback) {
        
        this.client.view(this.options.dbName+'/allEvents', {descending: false}, 
            function(err, res) {
                if(!err) {
                    var result = [];
                    for (var i in res) {
                        result.push(res[i].value);
                    }
                    callback(null, result);
                }
                else {
                    callback(err);
                }
            }.bind(this)
        );

    },

    // __getLastEventOfStream:__ loads the last event from the given stream in storage.
    // 
    // `storage.getLastEventOfStream(streamId, callback)`
    //
    // - __streamId:__ the stream id
    // - __callback:__ `function(err, event){}`
    getLastEventOfStream: function(streamId, callback) {
        this.client.view(this.options.dbName+'/eventsByStreamId', { key: streamId, descending: true }, 
            function(err, res) {
                if(!err) {
                    if (res.length) {
                        callback(null, res[0].value);
                    } else {
                        callback(null, null);
                    }
                }
                else {
                    callback(err);
                }
            }
        );
    },

    // __getEventRange:__ loads the range of events from given storage.
    // 
    // `storage.getEventRange(index, amount, callback)`
    //
    // - __index:__ entry index
    // - __amount:__ amount of events
    // - __callback:__ `function(err, events){}`
    getEventRange: function(index, amount, callback) {
        
        this.client.view(this.options.dbName+'/allEvents', {descending: false}, 
            function(err, res) {
                if(!err) {
                    var result = [];
                    for (var i in res) {
                        result.push(res[i].value);

                        if (result.length >= (index + amount)) {
                            break;
                        }
                    }

                    result = result.slice(index, (index + amount));

                    callback(null, result);
                }
                else {
                    callback(err);
                }
            }.bind(this)
        );

    },

    // __getSnapshot:__ loads the next snapshot back from given max revision or the latest if you 
    // don't pass in a _maxRev_.
    // 
    // `storage.getSnapshot(streamId, maxRev, callback)`
    //
    // - __streamId:__ id for requested stream
    // - __maxRev:__ revision endpoint (hint: -1 = to end)
    // - __callback:__ `function(err, snapshot){}`
    getSnapshot: function(streamId, maxRev, callback) {
        
        if (typeof maxRev === 'function') {
            callback = maxRev;
            maxRev = -1;
        }
        
        this.client.view(this.options.dbName+'/snapshotsByStreamId', { 'key': streamId }, 
            function(err, res) {
                if(!err) {
                    var result = [];
                    for (var i in res) {
                        result.push(res[i].value);
                    }
                    if (result.length === 0) {
                        callback(null, null);
                    } else {
                        if (maxRev === -1) {
                            callback(null, result[result.length-1]);
                        }
                        else {
                            for (var j = result.length -1; j >= 0; j--) {
                                if (result[j].revision <= maxRev) {
                                    callback(null, result[j]);
                                    return;
                                }
                            }
                        }
                    }
                }
                else {
                    callback(err);
                }
            }.bind(this));
    },

    // __getUndispatchedEvents:__ loads all undispatched events.
    //
    // `storage.getUndispatchedEvents(callback)`
    //
    // - __callback:__ `function(err, events){}`
    getUndispatchedEvents: function(callback) {
        
        this.client.view(this.options.dbName+'/allUndispatched', function(err, res) {
            if (err) {
                callback(err);
            }
            else {
                var result = [];
                for (var i in res) {
                    result.push(res[i].value);
                }
                callback(null, result);
            }
        });
    },

    // __setEventToDispatched:__ sets the given event to dispatched.
    //
    // __hint:__ instead of the whole event object you can pass: {_id: 'commitId'}
    //
    // `storage.setEventToDispatched(event, callback)`
    //
    // - __event:__ the event
    // - __callback:__ `function(err, events){}` [optional]
    setEventToDispatched: function(event, callback) {
        
        this.client.merge(event.commitId, {'dispatched': true}, function(err, res) {
            if (err) {
                callback(err);
            }
        });
    },

    // __getId:__ loads a new id from storage.
    //
    // `storage.getId(callback)`
    //
    // - __callback:__ `function(err, id){}`
    getId: function(callback) {
        
        this.store.uuids(function(err, uuids) {
            if (err) {
                callback(err);
            }
            else {
                if (typeof callback === 'function') {
                    callback(null, uuids.toString());
                }
            }
        });
    }
};

// helper
var mergeOptions = function(options, defaultOptions) {
    if (!options || typeof options === 'function') {
        return defaultOptions;
    }
    
    var merged = {};
    for (var attrname in defaultOptions) { merged[attrname] = defaultOptions[attrname]; }
    for (var attrname in options) { if (options[attrname]) merged[attrname] = options[attrname]; }
    return merged;  
};
