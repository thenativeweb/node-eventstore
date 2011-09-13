var root = this;

var EventStore;

if (typeof exports !== 'undefined') {
    EventStore = exports;
} else {
    EventStore = root.EventStore = {};
}

EventStore.VERSION = '0.0.1';

// shortcut
var es = EventStore;

/*******************************************
* EventStore Functions
*/

es.getEventStream = function(streamId, revMin, revMax) {
    var dummy = new EventStream(es, [new es.Event()]);
    return dummy;
};

es.commit = function(events) {
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