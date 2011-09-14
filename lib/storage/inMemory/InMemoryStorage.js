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

InMem.addEvent = function(streamId, event) {
    if (store[streamId] === undefined) {
        store[streamId] = [];
    }
    
    store[streamId].push(event);
};

InMem.getEvents = function(streamId, minRevision, maxRevision) {
    if (store[streamId] === undefined) {
       return undefined;
    }
    
    if (maxRevision === -1) {
        return store[streamId].slice(minRevision);
    }
    else {
        return store[streamId].slice(minRevision, maxRevision);
    }
    
};

InMem.getId = function() {
    return uuid();
};
