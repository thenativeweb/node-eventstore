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

// Create new instance of the event store.
EventStore.createStore = function(options) {
    return new Store(options);
};

/*******************************************
* Store 
*/
var Store = function(options) {
	this.options = options || {};
	this.logger = this.options.logger || null;
    this.publishingInterval = this.options.publishingInterval || 100;
	
    this.storage = undefined;
    this.publisher = undefined;
};

// With this function you can configure the event store.
Store.prototype.configure = function(fn) {
    fn.call(this);
    return this;
};

// In this function you can put modules for publisher and for storage.
Store.prototype.use = function(module) {
    if (util.checkInterface(module, interfaces.IStorage, {silent: true})) {
        this.storage = module;
    }
    
    if (util.checkInterface(module, interfaces.IPublisher, {silent: true})) {
        this.publisher = module;
    }
    
    // When all required modules are loaded start the publish worker.
    if ((this.storage !== undefined) && (this.publisher !== undefined)) {
        this._startPublishWorker();
    }
};

// This function is an "infinite loop" which publisher all undispatched events.
Store.prototype._startPublishWorker = function() {
    var publisher = this.publisher;
    var storage = this.storage;
    var logger = this.logger;
    var isReady = true;
    setInterval(function() {
        if (isReady)
        {
            isReady = false;
            async.waterfall([
                function(callback){
                    storage.getUndispatchedEvents(function(events) {
                        callback(null, events);
                    });
                },
                function(events, callback){
                    if (events && events.length > 0) {
                        for (var i in events) {
                            var item = events[i];
                            // Publish it now...
                            if (publisher) {
                                publisher.publish(item.payload);
                                
                                if (logger) {
                                    logger.info('publish event: '+JSON.stringify(item.payload));
                                }
                                
                                // ...and set the published event to dispatched.
                                storage.setEventToDispatched(item);
                                
                                if (logger) {
                                    logger.info('set event: "'+item.payload.event+'" to dispatched');
                                }
                            }
                        }
                    }
                    isReady = true;
                }
            ]);
        }
    }, this.publishingInterval);
};

// This function returns the event eventstream.
Store.prototype.getEventStream = function(streamId, revMin, revMax, callback) {
    if (!this.storage) {
        if (typeof callback === 'function') {
		    callback(new Error('Configure EventStore to use a storage implementation.'), null);
        }
    }
    else {    
        this.storage.getEvents(streamId, revMin, revMax, function(events) {
            var eventstream = new EventStream(this, streamId, events, {'logger': this.logger});
            if (typeof callback === 'function') {
                callback(null, eventstream);
            }
        }.bind(this));
    }
};

// This function commits the eventstream in the storage.
Store.prototype.commit = function(eventstream, callback) {
    if (!this.storage) {
		var error = new Error('Configure EventStore to use a storage implementation.');
		if (typeof callback === 'function') {
			callback(error, null);
		}
		else {
			if (this.logger) {
				this.logger.error(error);
			}
		}
    }
    else {
        var storage = this.storage;
        var publisher = this.publisher;
        var logger = this.logger;
        async.waterfall([
            // First we need a new id.
            function(callback){
                storage.getId(function(id) {
    				if (logger) {
    					logger.info('get new id "'+id+'" from storage');
    				}
                    callback(null, id);
                });
            },
            function(id, callback){
                // And than we can start committing.
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
                            // Push the event to committed.
                            eventstream.events.push(item);
                        }
                    ]);
                }
                
                // Remove uncommitted events. (It's like eventstream.uncommittedEvents = [])
                events = [];
                
                if (typeof callback === 'function') {
                    callback(null, eventstream);
                }
            }
        ]);
    }
};


/*******************************************
* EventStream Class
*/
var EventStream = function(store, streamId, events, options) {
	this.options = options || {};
	this.logger = this.options.logger || null;
	
    this.store = store;
    this.streamId = streamId;
    this.events = events || [];
    this.uncommittedEvents = [];
};

// This function returns the next stream revision.
EventStream.prototype._getNextStreamRevision = function() {
    var nextRev = -1;
    
    if (this.events.length > 0) {
        for (var i in this.events) {
            var evt = this.events[i];
            if (evt.streamRevision > nextRev) {
                nextRev = evt.streamRevision;
            }
        }
    }
    
    for (var j in this.uncommittedEvents) {
        var uEvt = this.uncommittedEvents[j];
        if (uEvt.streamRevision > nextRev) {
            nextRev = uEvt.streamRevision;
        }
    }
    
    nextRev++;
    
    return nextRev;
};

// This function adds an event to the uncommited events.
EventStream.prototype.addEvent = function(event) {
    var cont = new Event(this.streamId, event);
    var streamRevision = this._getNextStreamRevision();
    cont.streamRevision = streamRevision;
    if (this.logger) {
		this.logger.info('add event to eventstream(uncommittedEvents): '+JSON.stringify(cont));
	}
    this.uncommittedEvents.push(cont);
};

// This function calls the commit on the event store.
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
