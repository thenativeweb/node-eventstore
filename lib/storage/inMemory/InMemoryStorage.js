var uuid = require('./uuid');


var root = this

var InMemoryStorage;

if (typeof exports !== 'undefined') {
    InMemoryStorage = exports;
} else {
    InMemoryStorage = root.InMemoryStorage = {};
}

InMemoryStorage.VERSION = '0.0.1';

// shortcut
var InMem = InMemoryStorage;

/*******************************************
* InMemoryStorage Functions
*/

InMem.getId = function() {
    return uuid();
}
