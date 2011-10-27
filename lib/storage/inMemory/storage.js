var uuid = require('./uuid');

var root = this;

var InMemoryStorage;

if (typeof exports !== 'undefined') {
    InMemoryStorage = exports;
} else {
    InMemoryStorage = root.InMemoryStorage = {};
}

InMemoryStorage.VERSION = '0.0.1';

// Create new instance of storage.
InMemoryStorage.createStorage = function(options, callback) {
    new Storage(options, callback);
};

/*******************************************
* Storage 
*/
var Storage = function(options, callback) {
    callback = !callback ? options : callback;
    options = callback ? options : {};
    
    this.options = options || {};
    this.logger = this.options.logger || null;
 
    this.store = {};
    this.snapshots = {};
    callback(this);
};

// This functions clears all events. It's used for testing.
Storage.prototype._clear = function(callback) {
    this.store = {};
    this.snapshots = {};
    callback();
};

// This function saves an event in the storage.
Storage.prototype.addEvent = function(event, callback) {
    if (this.store[event.streamId] === undefined) {
        this.store[event.streamId] = [];
    }
    
    this.store[event.streamId].push(event);
    callback();
};

// This function saves a snapshot in the storage.
Storage.prototype.addSnapshot = function(snapshot, callback) {
    if (this.snapshots[snapshot.streamId] === undefined) {
        this.snapshots[snapshot.streamId] = [];
    }
    
    this.snapshots[snapshot.streamId].push(snapshot);
    callback();
};

// This function returns the wished events.
Storage.prototype.getEvents = function(streamId, minRev, maxRev, callback) {
    if (this.store[streamId] === undefined) {
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
};

// This function returns all events.
Storage.prototype.getAllEvents = function(callback) {
    var events = [];
    for (var i = 0, len = this.store.length; i < len; i++) {
        events = events.concat(this.store[i]);
    }
    
    callback(null, events);
};

// This function returns the wished snapshot.
// If revMax is -1 returns the latest snapshot.
Storage.prototype.getSnapshot = function(streamId, maxRev, callback) {
    if (this.snapshots[streamId] === undefined) {
       callback(null, {});
    }
    else {
        callback(null, this.snapshots[streamId][this.snapshots[streamId].length-1]);
    }
};

// This function returns all undispatched events.
Storage.prototype.getUndispatchedEvents = function(callback) {
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
};

// This function set an event to dispatched.
Storage.prototype.setEventToDispatched = function(evt) {
    evt.dispatched = true;
};

// This function returns a new id.
Storage.prototype.getId = function(callback) {
    callback(null, uuid().toString());
};
