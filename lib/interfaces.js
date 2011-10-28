var root = this;

var Interfaces;

if (typeof exports !== 'undefined') {
    Interfaces = exports;
} else {
    Interfaces = root.EventStore.Interfaces = {};
}

Interfaces.VERSION = '0.0.1';

// This describes the interface for a storage implementation.
Interfaces.IStorage = {
    addEvents: function(){},
    getEvents: function(){},
    getUndispatchedEvents: function(){},
    setEventToDispatched: function(){},
    getId: function(){}
};

// This describes the interface for a publisher implementation.
Interfaces.IPublisher = {
    publish: function(){}
};

Interfaces.ILogger = {
    info: function(){},
    warn: function(){},
    error: function(){}
}