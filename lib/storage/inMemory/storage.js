//     lib/storage/inMemory/storage.js v0.4.0
//     (c)(by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// An __inMemory__ implemetation for storage. __Use only for development purpose.__   
// For production there is a wide range of options (mongoDb, redis, couchDb) or role your own implementation.
var uuid = require('./uuid')
  , root = this
  , inMemoryStorage
  , Storage;

if (typeof exports !== 'undefined') {
    inMemoryStorage = exports;
} else {
    inMemoryStorage = root.inMemoryStorage = {};
}

inMemoryStorage.VERSION = '0.5.0';

// Create new instance of storage.
inMemoryStorage.createStorage = function(options, callback) {
    return new Storage(options, callback);
};

// ## inMemory storage
Storage = function(options, callback) {

    this.filename = __filename;
    this.isConnected = false;

    if (typeof options === 'function')
        callback = options;

    this.options = options;

    this.store = {};
    this.snapshots = {};
    
    if (callback) {
        this.connect(callback);
    }
};

Storage.prototype = {

    // __connect:__ connects the underlaying database.
    //
    // `storage.connect(callback)`
    //
    // - __callback:__ `function(err, storage){}`
    connect: function(callback) {
        this.isConnected = true;

        if (callback) callback(null, this);
    },

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
        
        if (!this.store[events[0].streamId]) {
            this.store[events[0].streamId] = [];
        }
        
        this.store[events[0].streamId] =  this.store[events[0].streamId].concat(events);
        callback(null);
    },
    
    // __addSnapshot:__ stores the snapshot
    // 
    // `storage.addSnapshot(snapshot, callback)`
    //
    // - __snapshot:__ the snaphot to store
    // - __callback:__ `function(err){}` [optional]
    addSnapshot: function(snapshot, callback) {
        if (!this.snapshots[snapshot.streamId]) {
            this.snapshots[snapshot.streamId] = [];
        }
        
        this.snapshots[snapshot.streamId].push(snapshot);
        callback(null);
    },

    // __getEvents:__ loads the events from _minRev_ to _maxRev_.
    // 
    // `storage.getEvents(streamId, minRev, maxRev, callback)`
    //
    // - __streamId:__ id for requested stream
    // - __minRev:__ revision startpoint
    // - __maxRev:__ revision endpoint (hint: -1 = to end) [optional]
    // - __callback:__ `function(err, events){}`
    getEvents: function(streamId, minRev, maxRev, callback) {
        
        if (typeof maxRev === 'function') {
            callback = maxRev;
            maxRev = -1;
        }
        
        if (!this.store[streamId]) {
           callback(null, []);
        }
        else {
            if (maxRev === -1) {
                callback(null, this.store[streamId].slice(minRev));
            }
            else {
                callback(null, this.store[streamId].slice(minRev, maxRev));
            }
        }
    },

    // __getEventRange:__ loads the range of events from given storage.
    // 
    // `storage.getEventRange(match, amount, callback)`
    //
    // - __match:__ match query in inner event (payload)
    // - __amount:__ amount of events
    // - __callback:__ `function(err, events){}`
    getEventRange: function(match, amount, callback) {
        var events = [];
        for (var e in this.store) {
            events = events.concat(this.store[e]);
        }

        events.sort(function(a, b){
             return a.commitStamp - b.commitStamp;
        });

        var index = 0;

        if (match) {
            for (var m in match) {
                if (match.hasOwnProperty(m)) {

                    for (var len = events.length; index < len; index++) {
                        var evt = events[index];
                        
                        if (evt.payload[m] === match[m]) {
                            break;
                        }
                    }
                    
                    break;
                }
            }
        }

        if (events.length > index + 1) {

            var endIndex = 0;
            if (events.length > index + 1 + amount) {
                endIndex = index + 1 + amount;
            } else if (events.length <= index + 1 + amount) {
                endIndex = events.length;
            }

            events = events.slice(index + 1, endIndex);
        }

        callback(null, events);
    },

    // __getEvents:__ loads the events from _minRev_ to _maxRev_.
    // 
    // `storage.getAllEvents(from, amount, callback)`
    //
    // - __from:__ from entry index [optional, default 0]
    // - __amount:__ amount of results (hint: -1 = to end) [optional]
    // - __callback:__ `function(err, events){}`
    getAllEvents: function(from, amount, callback) {
        
        if (typeof amount === 'function') {
            callback = amount;
            amount = -1;
        }

        if (typeof from === 'function') {
            callback = from;
            from = 0;
            amount = -1;
        }
        
        if (!this.store) {
           callback(null, []);
        }
        else {
            var res = [];
            for (var s in this.store) {
                res = res.concat(this.store[s]);
            }
            if (amount === -1) {
                callback(null, res.slice(from));
            }
            else {
                callback(null, res.slice(from, from + amount));
            }
        }
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
        
        if (!this.snapshots[streamId]) {
           callback(null, {});
        }
        else {
            if (maxRev == -1) {
                callback(null, this.snapshots[streamId][this.snapshots[streamId].length - 1]);
            } else {
                var snaps = this.snapshots[streamId];
                for (var i = snaps.length -1; i >= 0; i--) {
                    if (snaps[i].revision <= maxRev) {
                        callback(null, snaps[i]);
                        return;
                    }
                }
            }
        }
    },
    
    // __getUndispatchedEvents:__ loads all undispatched events.
    //
    // `storage.getUndispatchedEvents(callback)`
    //
    // - __callback:__ `function(err, events){}`
    getUndispatchedEvents: function(callback) {
        var array = [];
        
        for (var ele in this.store) {
            var elem = this.store[ele];
            for (var evt in elem) {
                if (elem[evt].dispatched === false) {
                    array.push(elem[evt]);
                }
            }
        }
        
        callback(null, array);
    },
    
    // __setEventToDispatched:__ sets the given event to dispatched.
    //
    // __hint:__ instead of the whole event object you can pass: {_id: 'commitId'}
    //
    // `storage.setEventToDispatched(event, callback)`
    //
    // - __event:__ the event
    // - __callback:__ `function(err, events){}` [optional]
    setEventToDispatched: function(evt, callback) {
        evt.dispatched = true;
        callback(null);
    },
    
    // __getId:__ loads a new id from storage.
    //
    // `storage.getId(callback)`
    //
    // - __callback:__ `function(err, id){}`
    getId: function(callback) {
        callback(null, uuid().toString());
    }
};
