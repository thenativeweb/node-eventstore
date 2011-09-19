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
    getId: function(){}
};

Interfaces.IPublish = {
    publish: function(){}
};