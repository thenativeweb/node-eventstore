var cradle = require('cradle')
  , root = this
  , couchDbStorage
  , Storage;

if (typeof exports !== 'undefined') {
    couchDbStorage = exports;
} else {
    couchDbStorage = root.couchDbStorage = {};
}

couchDbStorage.VERSION = '0.0.1';

// Create new instance of storage.
couchDbStorage.createStorage = function(options, callback) {
    new Storage(options, callback);
};


/*******************************************
* Storage 
*/
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

    // This function saves an event in the storage.
    addEvents: function(events, callback) {
        for(var i in events) {
            events[i]._id = events[i].commitId;
        }
        this.client.save(events, callback);
    },

    // This function saves a snapshot in the storage.
    addSnapshot: function(snapshot, callback) {
        snapshot._id = snapshot.snapshotId;
        this.client.save(snapshot, callback);
    },

    // This function returns the wished events.
    getEvents: function(streamId, minRev, maxRev, callback) {
        
        if (typeof maxRev === 'function') {
            callback = maxRev;
            maxRev = -1;
        }
        
        this.client.view(this.options.dbName+'/eventsByStreamId', { 'key': streamId }, 
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
            });
    },

    // This function returns all events.
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
            }.bind(this));
    },

    // This function returns the wished snapshot.
    // If revMax is -1 returns the latest snapshot.
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
                            for (var i = result.length -1; i >= 0; i--) {
                                if (result[i].revision <= maxRev) {
                                    callback(null, result[i]);
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

    // This function returns all undispatched events.
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

    // This function set an event to dispatched.
    setEventToDispatched: function(event, callback) {
        
        this.client.merge(event.commitId, {'dispatched': true}, function(err, res) {
            if (err) {
                callback(err);
            }
        });
    },

    // This function returns a new id.
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
