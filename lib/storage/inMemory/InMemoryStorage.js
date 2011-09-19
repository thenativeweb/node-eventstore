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

Storage.prototype.addEvent = function(event) {
    if (!event.streamId) {
        throw new Error('event must provide a streamId');
    }
    
    if (this.store[event.streamId] === undefined) {
        this.store[event.streamId] = [];
    }
    
    this.store[event.streamId].push(event);
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

Storage.prototype.getId = function() {
    return uuid();
};
