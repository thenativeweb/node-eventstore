var root = this;

var Interfaces;

if (typeof exports !== 'undefined') {
    Interfaces = exports;
} else {
    Interfaces = root.EventStore.Interfaces = {};
}

Interfaces.VERSION = '0.0.1';

Interfaces.IStorage = {
    addEvent: function(){},
    getEvents: function(){},
    getUndispatchedEvents: function(){},
    setEventToDispatched: function(){},
    getId: function(){}
};

Interfaces.IPublisher = {
    publish: function(){}
};