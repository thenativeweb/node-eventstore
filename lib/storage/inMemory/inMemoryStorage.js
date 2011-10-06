var uuid = require('./uuid');

var root = this;

var InMemoryStorage;

if (typeof exports !== 'undefined') {
    InMemoryStorage = exports;
} else {
    InMemoryStorage = root.InMemoryStorage = {};
}

InMemoryStorage.VERSION = '0.0.1';

// create new instance of storage
InMemoryStorage.createStorage = function(options) {
    return new Storage(options);
};

/*******************************************
* Storage 
*/
var Storage = function(options) {
    this.store = {};
};

Storage.prototype.addEvent = function(event, clb) {
    if (!event.streamId) {
        throw new Error('event must provide a streamId');
    }
    event.dispatched = false;
    if (this.store[event.streamId] === undefined) {
        this.store[event.streamId] = [];
    }
    
    this.store[event.streamId].push(event);
    clb();
};

Storage.prototype.getEvents = function(streamId, minRev, maxRev) {
    if (this.store[streamId] === undefined) {
       return undefined;
    }
    
    if (maxRev === -1) {
        return this.store[streamId].slice(minRev);
    }
    else {
        return this.store[streamId].slice(minRev, maxRev);
    }
};

Storage.prototype.getUndispatchedEvents = function() {
    var array = [];
    
    for (var ele in this.store) {
        for (var evt in ele) {
            if (!evt.dispatched) {
                array.push(evt);
            }
        }
    }
    
    array.sort(function(a,b) {
        if (a.commitStamp > b.commitStamp) return 1;
        if (a.commitStamp < b.commitStamp) return -1;
        return 0;
    });
    
    return array;
};

Storage.prototype.setEventToDispatched = function(evt) {
    evt.dispatched = true;
};

Storage.prototype.getId = function(callback) {
    if (typeof callback === 'function') {
        callback(uuid());
    }
};