//     storage.js v0.0.1
//     (c) 2012 Kaba AG, MIC AWM; under MIT License
//     (by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// The storage is the database driver for redis.
//
// __Example:__
//
//      require('[pathToStorage]/storage').createStorage({}, function(err, storage) {
//          ...
//      });

var redis = require('redis')
  , root = this
  , redisStorage
  , Storage;

if (typeof exports !== 'undefined') {
    redisStorage = exports;
} else {
    redisStorage = root.redisStorage = {};
}

redisStorage.VERSION = '0.0.1';

// Create new instance of storage.
redisStorage.createStorage = function(options, callback) {
    new Storage(options, callback);
};

// ## redis storage
Storage = function(options, callback) {
    if (typeof options === 'function')
        callback = options;
        
    var defaults = {
        host: 'localhost',
        port: 6379,
        database: 0,
        eventsCollectionName: 'events',
        snapshotsCollectionName: 'snapshots'
    };
    
    this.options = mergeOptions(options, defaults);
    this.client = redis.createClient(this.options.port, this.options.host);
    
    var self = this;
    this.client.on('ready', function () {
        if (options.database !== 0) {
            self.client.select(self.options.database, function(err, ok) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, self);
                }
            });
        } else {
            callback(null, self);
        }
    });
};

Storage.prototype = {

    // __addEvents:__ saves all events.
    //
    // `storage.addEvents(events, callback)`
    //
    // - __events:__ the events array
    // - __callback:__ `function(err){}`
    addEvents: function(events, callback) {
        if (!events || events.length === 0) { 
            callback(null);
            return;
        }
        
        var self = this
          , args = [];
          
        events.forEach(function(event) {
            args.push(JSON.stringify(event));
        });
        
        this.client.rpush(this.options.eventsCollectionName + ':' + events[0].streamId, args, function(err, res) {
            if (err) {
                callback(err);
            } else {
                self.client.rpush('undispatched:' + self.options.eventsCollectionName, args, callback);
            }
        });
    },
    
    // __addSnapshot:__ stores the snapshot
    // 
    // `storage.addSnapshot(snapshot, callback)`
    //
    // - __snapshot:__ the snaphot to store
    // - __callback:__ `function(err){}` [optional]
    addSnapshot: function(snapshot, callback) {          
        this.client.lpush(this.options.snapshotsCollectionName + ':' + snapshot.streamId, JSON.stringify(snapshot), callback);
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

        maxRev = maxRev > 0 ? maxRev - 1 : maxRev;
        
        this.client.lrange(this.options.eventsCollectionName + ':' + streamId, minRev, maxRev, function (err, res) {
            handleResultSet(err, res, callback);
        });
    },

    // __getAllEvents:__ loads the events.
    //
    // __warning:__ don't use this in production!!!
    // 
    // `storage.getAllEvents(callback)`
    //
    // - __callback:__ `function(err, events){}`
    getAllEvents: function(callback) {
        
        var self = this;
        
        this.client.keys(this.options.eventsCollectionName + ':*', function (err, res) {
            if (err) {
                callback(err);
            } else {
                var arr = [];

                if (res.length === 0) {
                    callback(null, arr);
                } else {
                    var last = res[res.length - 1];
                    res.forEach(function(key) {
                        self.client.lrange(key, 0, -1, function (err, res) {
                            if (err) {
                                callback(err);
                            } else {
                                res.forEach(function(item) {
                                    arr.push(JSON.parse(item));
                                });
                            }
                            
                            if (key == last) {
                                callback(null, arr);
                            }
                        });
                    });
                }
            }
        });
    },

    // __getEventRange:__ loads the range of events from given storage.
    // 
    // `storage.getEventRange(index, amount, callback)`
    //
    // - __index:__ entry index
    // - __amount:__ amount of events
    // - __callback:__ `function(err, events){}`
    getEventRange: function(index, amount, callback) {
        var self = this;
        
        this.client.keys(this.options.eventsCollectionName + ':*', function (err, res) {
            if (err) {
                callback(err);
            } else {
                var arr = [];

                if (res.length === 0) {
                    callback(null, arr);
                } else {
                    var last = res[res.length - 1];
                    res.forEach(function(key) {
                        self.client.lrange(key, 0, -1, function (err, res) {
                            if (err) {
                                callback(err);
                            } else {
                                res.forEach(function(item) {
                                    arr.push(JSON.parse(item));

                                    if (arr.length >= (index + amount)) {
                                        return;
                                    }
                                });
                            }
                            
                            if (key == last) {

                                arr = arr.slice(index, (index + amount));

                                callback(null, arr);
                            }
                        });
                    });
                }
            }
        });
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
    
        if (maxRev === -1) {
            this.client.lrange(this.options.snapshotsCollectionName + ':' + streamId, 0, 0, function (err, res) {
                if (res && res.length === 1) {
                    callback(err, JSON.parse(res[0]));
                } else {
                    callback(err, null);
                }
            });
        }
        else {
            this.client.lrange(this.options.snapshotsCollectionName + ':' + streamId, 0, -1, function (err, res) {
                if (err) {
                    callback(err);
                } else if (res && res.length > 0) {
                    for (var i = res.length - 1; i >= 0; i--) {
                        var snap = JSON.parse(res[i]);
                        if (snap.revision <= maxRev) {
                            callback(null, snap);
                            break;
                        }
                    }
                }
                else {
                    callback(null, {});
                }
            });
        } 
    },

    // __getUndispatchedEvents:__ loads all undispatched events.
    //
    // `storage.getUndispatchedEvents(callback)`
    //
    // - __callback:__ `function(err, events){}`
    getUndispatchedEvents: function(callback) {
    
        this.client.lrange('undispatched:' + this.options.eventsCollectionName, 0, -1, function (err, res) {
            handleResultSet(err, res, callback);
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
    setEventToDispatched: function(event) {
        this.client.lrem('undispatched:' + this.options.eventsCollectionName, JSON.stringify(event), 0);
    },

    // __getId:__ loads a new id from storage.
    //
    // `storage.getId(callback)`
    //
    // - __callback:__ `function(err, id){}`
    getId: function(callback) {
        this.client.incr('nextItemId', function(err, id) {
            if (err) {
                callback(err);
            } else {
                callback(null, id.toString());
            }
        });
    }
};

// helpers
var handleResultSet = function(err, res, callback) {
    if (err) {
        callback(err);
    }
    else if (res && res.length > 0) {
        var arr = [];

        res.forEach(function(item) {
            arr.push(JSON.parse(item));
        });
        
        callback(null, arr);
    }
    else {
        callback(null, []);
    }
};

var mergeOptions = function(options, defaultOptions) {
    if (!options || typeof options === 'function') {
        return defaultOptions;
    }
    
    var merged = {};
    for (var attrname in defaultOptions) { merged[attrname] = defaultOptions[attrname]; }
    for (var attrname in options) { if (options[attrname]) merged[attrname] = options[attrname]; }
    return merged;  
};
