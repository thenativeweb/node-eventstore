var root = this;

var EventStore;

if (typeof exports !== 'undefined') {
    EventStore = exports;
} else {
    EventStore = root.EventStore = {};
}

EventStore.VERSION = '0.0.1';

// create new instance of storage
EventStore.createStore = function(options) {
    return new Store(options);
};

/*******************************************
* Store 
*/
var Store = function(options) {
    this.storage = undefined;
};

Store.prototype.configure = function(fn) {
    fn.call(this);
    return this;
};

// keep it stupid for now
Store.prototype.use = function(module) {
    this.storage = module;
};

Store.prototype.getEventStream = function(streamId, revMin, revMax) {
    if (!this.storage) {
        throw new Error('Configure EventStore to use a storage implementation.');
    }
    
    return new EventStream(this, this.storage.getEvents(streamId, revMin, revMax));
};

Store.prototype.commit = function(events) {
    if (!this.storage) {
        throw new Error('Configure EventStore to use a storage implementation.');
    }
    
    if (events instanceof Array) {
        for (i = 0, len = events.length; i < len; i++) {
            this.storage.addEvent(events[i]);
        }
    } else {
        this.storage.addEvent(events);
    }
    
    return true;
};


/*******************************************
* EventStream Class
*/

var EventStream = function(store, events) {
        this.store = store;
        this.events = events || [];
        this.uncommittedEvents = [];
};

EventStream.prototype.addEvent = function(event) {
    this.uncommittedEvents.push(event);
}

EventStream.prototype.commit = function() {
    return this.store.commit(this.uncommittedEvents);
};

/*******************************************
* Event Class
*/

var Event = function() {
    this.streamId = null;
    this.streamRevision = null;
    this.commitId = null;
    this.commitSequence = null;
    this.commitStamp = null;
    this.header = null;
    this.dispatched = false;
    this.payload = null;    
};

/*******************************************
* Public Classes
*/

Store.Event = Event;