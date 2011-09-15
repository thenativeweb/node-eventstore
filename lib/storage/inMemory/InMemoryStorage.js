var uuid = require('./uuid');


var root = this;

var InMemoryStorage;

if (typeof exports !== 'undefined') {
    InMemoryStorage = exports;
} else {
    InMemoryStorage = root.InMemoryStorage = {};
}

InMemoryStorage.VERSION = '0.0.1';

// shortcut
var InMem = InMemoryStorage;

// private fields
var store = {}; // plain object as associative array

/*******************************************
* InMemoryStorage Functions
*/

InMem.addEvent = function(event) {
    if (!event.streamId) {
        throw new Error('event must provide a streamId');
    }
    
    if (store[event.streamId] === undefined) {
        store[event.streamId] = [];
    }
    
    store[event.streamId].push(event);
};

InMem.getEvents = function(streamId, minRev, maxRev) {
    if (store[streamId] === undefined) {
       return undefined;
    }
    
    if (maxRev === -1) {
        return store[streamId].slice(minRev);
    }
    else {
        return store[streamId].slice(minRev, maxRev);
    }
};

InMem.getId = function() {
    return uuid();
};
