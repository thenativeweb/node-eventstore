var interfaces = require('./interfaces')
  , util =  require('./util')
  , async = require('async');

var root = this
  , EventStore
  , Store;

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
Store = function(options) {
    this.options = options || {};
    this.publishingInterval = this.options.publishingInterval || 100;
    
    this.storage = undefined;
    this.publisher = undefined;
    this.logger = undefined;
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
    
    if (util.checkInterface(module, interfaces.ILogger, {silent: true})) {
        this.logger = module;
    }
    
    // When all required modules are loaded start the publish worker.
    if ((this.storage !== undefined) && (this.publisher !== undefined)) {
        this._startPublishWorker();
    }
};

Store.prototype.log = function(msg, level) {
    if (!this.logger)
        return;
        
    if (level) {
        this.logger[level](msg);
    } else {
        this.logger.info(msg);
    }    
}

// This function is an "infinite loop" which publisher all undispatched events.
Store.prototype._startPublishWorker = function() {
    var self = this;
    var isReady = true;
    setInterval(function() {
        if (isReady)
        {
            isReady = false;
            async.waterfall([
                function(callback){
                    self.storage.getUndispatchedEvents(function(events) {
                        callback(null, events);
                    });
                },
                function(events, callback){
                    if (events && events.length > 0) {
                        for (var i in events) {
                            var item = events[i];
                            // Publish it now...
                            if (self.publisher) {
                                self.publisher.publish(item.payload);
                                self.log('SEND EVENT ' + item.payload.event + ' to bus: ' + JSON.stringify(item.payload));
                                
                                // ...and set the published event to dispatched.
                                self.storage.setEventToDispatched(item);  
                                self.log('set event: "'+item.payload.event+' ('+item.payload.id+')" to dispatched');
                            }
                        }
                    }
                    isReady = true;
                }
            ]);
        }
    }, this.publishingInterval);
};

// This function saves a snapshot.
Store.prototype.commitSnapshot = function(snapshot, clb) {
    if (!this.storage) {
        var error = new Error('Configure EventStore to use a storage implementation.');
    	if (typeof clb === 'function') {
			clb(error);
		}
		else {
			this.log(error, 'error');
		}
    }
    else {
        var self = this;
        async.waterfall([
            // First we need a new id.
            function(callback){
                self.storage.getId(function(id) {
                    self.log('get new id "' + id + '" from storage');
                    snapshot.snapshotId = id;
                    callback(null);
                });
            },
            function(callback){
                // And than we can start committing.
                self.storage.addSnapshot(snapshot, function(err) {
                    self.log('added new snapshot: ' + JSON.stringify(snapshot));
                    if (typeof clb === 'function') {
                        clb(err);
                    }
                    else if (err) {
                        self.log(err, 'error');
                    }
                });               
            }
        ]);
    }
};

// This function returns the snapshot and the events from snapshot revision with snapshot <= maxrev.
Store.prototype.getFromSnapshot = function(streamId, revMax, callback) {
    if (!this.storage) {
        if (typeof callback === 'function') {
            callback(new Error('Configure EventStore to use a storage implementation.'), null, null);
        }
    }
    else {
        revMax = revMax === undefined ? -1 : revMax;
        this.storage.getSnapshot(streamId, revMax, function(snapshot) {
            snapshot = snapshot ? snapshot : {};
            var revMin = snapshot.snapshotRevision > 0 ? snapshot.snapshotRevision + 1 : 0;
            this.getEventStream(streamId, revMin, revMax, function (err, eventstream) {
                if (typeof callback === 'function') {
                    callback(null, snapshot, eventstream);
                }
            }.bind(this));
            
        }.bind(this));
    }
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

// This function returns all events.
Store.prototype.getAllEvents = function(callback) {
    if (!this.storage) {
        if (typeof callback === 'function') {
            callback(new Error('Configure EventStore to use a storage implementation.'), null);
        }
    }
    else {    
        this.storage.getAllEvents(function(events) {
            var innerEvents = [];
            
            for(var i in events) {
                innerEvents.push(events[i].payload);
            }
            
            if (typeof callback === 'function') {
                callback(null, innerEvents);
            }
        }.bind(this));
    }
};

// This function commits the eventstream in the storage.
Store.prototype.commit = function(eventstream, clb) {
    if (!this.storage) {
		var error = new Error('Configure EventStore to use a storage implementation.');
		if (typeof callback === 'function') {
			callback(error, null);
		}
		else {
                    this.log(error, 'error');
		}
    }
    else {
        self = this;
        async.waterfall([
            // First we need a new id.
            function(callback){
                self.storage.getId(function(id) {
                    self.log('get new id "' + id + '" from storage');
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
                            self.storage.addEvent(item, function() {
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
                
                if (typeof clb === 'function') {
                    clb(null, eventstream);
                }
            }
        ]);
    }
};

/*******************************************
* Snapshot Class
*/
var Snapshot = function(snapshotId, streamId, snapshotRevision, data, options) {
    this.snapshotId = snapshotId;
    this.streamId = streamId;
    this.snapshotRevision = snapshotRevision;
    this.data = data;
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
    this.nextRevision = 0;
};

// This function returns the next stream revision.
EventStream.prototype._getNextStreamRevision = function() {
    for (var i in this.events) {
        var evt = this.events[i];
        if (evt.streamRevision >= this.nextRevision) {
            this.nextRevision = evt.streamRevision + 1;
        }
    }
    
    for (var j in this.uncommittedEvents) {
        var uEvt = this.uncommittedEvents[j];
        if (uEvt.streamRevision >= this.nextRevision) {
            this.nextRevision = uEvt.streamRevision + 1;
        }
    }
    
    return this.nextRevision;
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
EventStream.prototype.createSnapshot = function(data, callback) {
    var snapshotId = null;
    var streamId = this.streamId;
    var nextRev = this._getNextStreamRevision();
    var snapshotRevision = nextRev > 0 ? nextRev - 1 : 0;
    
    var snapshot = new Snapshot(snapshotId, streamId, snapshotRevision, data);

    return this.store.commitSnapshot(snapshot, callback);
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
Store.EventStream = EventStream;
