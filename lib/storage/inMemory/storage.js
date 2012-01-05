//     lib/storage/inMemory/storage.js v0.3.0
//     (c) 2012 Kaba AG, MIC AWM; under MIT License
//     (by) Jan Muehlemann (jamuhl)
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

inMemoryStorage.VERSION = '0.3.0';

// Create new instance of storage.
inMemoryStorage.createStorage = function(options, callback) {
    new Storage(options, callback);
};

// ## inMemory storage
Storage = function(options, callback) { 
    if (typeof options === 'function')
        callback = options;

    this.store = {};
    this.snapshots = {};
    
    callback(null, this);
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
    // - __callback:__ `function(err, snapshot, eventStream){}`
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
    
    // __getAllEvents:__ loads the events.
    //
    // __warning:__ don't use this in production!!!
    // 
    // `storage.getAllEvents(callback)`
    //
    // - __callback:__ `function(err, events){}`
    getAllEvents: function(callback) {
        var events = [];
        for (var i in this.store) {
            events = events.concat(this.store[i]);
        }
        
        events.sort(function(a, b){
             return a.commitStamp - b.commitStamp;
        });
        
        callback(null, events);
    },

    // __getEventRange:__ loads the range of events from given storage.
    // 
    // `storage.getEventRange(index, amount, callback)`
    //
    // - __index:__ entry index
    // - __amount:__ amount of events
    // - __callback:__ `function(err, events){}`
    getEventRange: function(index, amount, callback) {
        var events = [];
        for (var i in this.store) {
            events = events.concat(this.store[i]);

            if (events.length >= (index + amount)) {
                break;
            }
        }
        
        events = events.slice(index, (index + amount));

        events.sort(function(a, b){
             return a.commitStamp - b.commitStamp;
        });

        callback(null, events);
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
    setEventToDispatched: function(evt) {
        evt.dispatched = true;
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
