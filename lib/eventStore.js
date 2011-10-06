var interfaces = require('./interfaces')
  , util =  require('./util')
  , async = require('async');

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
    this.publisher = undefined;
};

Store.prototype.configure = function(fn) {
    fn.call(this);
    return this;
};

// keep it stupid for now
Store.prototype.use = function(module) {
    if (util.checkInterface(module, interfaces.IStorage, {silent: true})) {
        this.storage = module;
    }
    
    if (util.checkInterface(module, interfaces.IPublisher, {silent: true})) {
        this.publisher = module;
    }
};

Store.prototype.getEventStream = function(streamId, revMin, revMax, callback) {
    if (!this.storage) {
        throw new Error('Configure EventStore to use a storage implementation.');
    }
    
    var eventstream = new EventStream(this, streamId, this.storage.getEvents(streamId, revMin, revMax));
    
    if (typeof callback === 'function') {
        callback(null, eventstream);
    }
};

Store.prototype.commit = function(eventstream) {
    if (!this.storage) {
        throw new Error('Configure EventStore to use a storage implementation.');
    }
    
    var storage = this.storage;
    var publisher = this.publisher;
    async.waterfall([
        function(callback){
            storage.getId(function(id) {
                callback(null, id);
            });
        },
        function(id, callback){
            var events = eventstream.uncommittedEvents
              , commitId = id
              , item = null;
        
            for (i = 0, len = events.length; i < len; i++) {
                item = events[i];
                item.commitId = commitId;
                item.commitSequence = i;
                item.commitStamp = new Date();
                
                async.waterfall([
                    function(callback) {
                        storage.addEvent(item, function() {
                            callback(null, item);
                        });
                    },
                    function(item, callback) {
                        // publish it now
                        if (publisher) {
                            publisher.publish(item.payload);
                            storage.setEventToDispatched(item);
                        }
                        
                        // push to committed
                        eventstream.events.push(item);
                    }
                ]);
            }
            
            // remove uncommitted
            events = [];
            
            if (typeof callback === 'function') {
                callback(null, eventstream);
            }
        }
    ]);
};


/*******************************************
* EventStream Class
*/

var EventStream = function(store, streamId, events) {
        this.store = store;
        this.streamId = streamId;
        this.events = events || [];
        this.uncommittedEvents = [];
};

EventStream.prototype.addEvent = function(event) {
    var cont = new Event(this.streamId, event);
    this.uncommittedEvents.push(cont);
};

EventStream.prototype.commit = function() {
    return this.store.commit(this);
};

/*******************************************
* Event Class
*/

var Event = function(streamId, event) {
    this.streamId = streamId || null;
    this.streamRevision = null;
    this.commitId = null;
    this.commitSequence = null;
    this.commitStamp = null;
    this.header = null;
    this.dispatched = false;
    this.payload = event || null;    
};

/*******************************************
* Public Classes
*/

Store.Event = Event;