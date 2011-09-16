var root = this;

var EventStore;

if (typeof exports !== 'undefined') {
    EventStore = exports;
} else {
    EventStore = root.EventStore = {};
}

EventStore.VERSION = '0.0.1';

/*******************************************
* EventStore 
*/

var es = EventStore
  , storage = undefined;

/*******************************************
* EventStore Functions
*/

es.configure = function(fn) {
    fn.call(this);
    return es;
};

// keep it stupid for now
es.use = function(module) {
    storage = module;
};

es.getEventStream = function(streamId, revMin, revMax) {
    if (!storage) {
        throw new Error('Configure EventStore to use a storage implementation.');
    }
    
    return new EventStream(es, storage.getEvents(streamId, revMin, revMax));
};

es.commit = function(events) {
    if (!storage) {
        throw new Error('Configure EventStore to use a storage implementation.');
    }
    
    if (events instanceof Array) {
        for (i = 0, len = events.length; i < len; i++) {
            storage.addEvent(events[i]);
        }
    } else {
        storage.addEvent(events);
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

es.Event = Event;