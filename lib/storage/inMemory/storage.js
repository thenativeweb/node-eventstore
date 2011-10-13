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
    callback(this);
};

// This functions clears all events. It's used for testing.
Storage.prototype._clear = function(clb) {
    this.store = {};
    clb();
};

// This function saves an event in the storage.
Storage.prototype.addEvent = function(event, clb) {
    if (this.store[event.streamId] === undefined) {
        this.store[event.streamId] = [];
    }
    
    this.store[event.streamId].push(event);
    clb();
};

// This function returns the wished events.
Storage.prototype.getEvents = function(streamId, minRev, maxRev, callback) {
    if (this.store[streamId] === undefined) {
       callback([]);
    }
    else {
        if (maxRev === -1) {
            callback(this.store[streamId].slice(minRev));
        }
        else {
            callback(this.store[streamId].slice(minRev, maxRev));
        }
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
    
    callback(array);
};

// This function set an event to dispatched.
Storage.prototype.setEventToDispatched = function(evt) {
    evt.dispatched = true;
};

// This function returns a new id.
Storage.prototype.getId = function(callback) {
    if (typeof callback === 'function') {
        callback(uuid().toString());
    }
};
