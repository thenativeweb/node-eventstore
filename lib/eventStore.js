var interfaces = require('./interfaces')
  , util =  require('./util')
  , async = require('async')
  , root = this
  , eventStore
  , Store
  , PublishWorker;

if (typeof exports !== 'undefined') {
    eventStore = exports;
} else {
    eventStore = root.eventStore = {};
}

eventStore.VERSION = '0.0.1';

// Create new instance of the event store.
eventStore.createStore = function(options) {
    return new Store(options);
};

/*******************************************
* Store 
*/
Store = function(options) {
    this.options = options || {};
    
    this.undispatchedEventsQueue = [];
    
    this.storage = undefined;
    this.publisher = undefined;
    this.logger = undefined;
};


Store.prototype = {
    
    start: function() {
        if (!this.logger && this.options.logger === 'console') {
            this.use(require('./logger/consoleLogger'));
        }
    
        var worker = new PublishWorker(this)
        worker.start();
    },
    
    // With this function you can configure the event store.
    configure: function(fn) {
        fn.call(this);
        return this;
    },
    
    // In this function you can put modules for publisher and for storage.
    use: function(module) {
        if (util.checkInterface(module, interfaces.IStorage, {silent: true})) {
            this.storage = module;
        }
        
        if (util.checkInterface(module, interfaces.IPublisher, {silent: true})) {
            this.publisher = module;
        }
        
        if (util.checkInterface(module, interfaces.ILogger, {silent: true})) {
            this.logger = module;
        }
    },
    
    log: function(msg, level) {
        if (!this.logger)
            return;
            
        if (level) {
            this.logger[level](msg);
        } else {
            this.logger.info(msg);
        }    
    },
    
    hasConfigurationErrors: function(callback) {
        var err;
        
        if (!this.storage) {
            err = new Error('Configure EventStore to use a storage implementation.');
        }
           
        if (err && callback) {
            callback(err);
        }
            
        return err;
    },
    
    // This function returns the snapshot and the events from snapshot revision with snapshot <= maxrev.
    getFromSnapshot: function(streamId, revMax, callback) {
            
        if (this.hasConfigurationErrors(callback)) return;
        
        if (typeof revMax === 'function') {
            callback = revMax;
            revMax = -1;
        }
        
        var self = this
          , snapshot
          , eventStream;
         
        async.waterfall([
            
            function getSnapshot(callback) {
                self.storage.getSnapshot(streamId, revMax, callback);
            },
            
            function getEventStream(snap, callback) {
                self.getEventStream(streamId, snap.revision + 1, revMax, function(err, stream) {
                    if (err) callback(err);
                    
                    snapshot = snap;
                    eventStream = stream;
                    callback(null);
                });
            }],
            
            function (err) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, snapshot, eventStream);
                }
            }
        );        
    },
    
    // This function saves a snapshot.
    commitSnapshot: function(snapshot, callback) {
        
        if (this.hasConfigurationErrors(callback)) return;
        
        var self = this;
        
        async.waterfall([
            
            function getNewIdFromStorage(callback) {
                self.storage.getId(callback)
            },
            
            function commit(id, callback) {
                self.log('get new id "' + id + '" from storage');
                snapshot.id = id; 
                self.storage.addSnapshot(snapshot, callback)
            }],
            
            function (err) {
                if (err) {
                    callback(err);
                } else {
                    self.log('added new snapshot: ' + JSON.stringify(snapshot));
                    callback(null);
                }
            }
        );  
    },
    
    // This function returns the event eventstream.
    getEventStream: function(streamId, revMin, revMax, callback) {
        
        if (this.hasConfigurationErrors(callback)) return;
        
        var self = this;
        this.storage.getEvents(streamId, revMin, revMax, function(err, events) {
            if (err) {
                callback(err)
            } else {
                callback(null, new EventStream(self, streamId, events));
            }
        });
        
    },
    
    commit: function(eventstream, callback) {
    
        if (this.hasConfigurationErrors(callback)) return;
    
        self = this;
        
        async.waterfall([
            
            function getNewCommitId(callback) {
                self.storage.getId(callback)
            },
            
            function commitEvents(id, callback) {
               
                // And than we can start committing.
                var event
                  , currentRevision = eventstream.currentRevision();
            
                for (i = 0, len = eventstream.uncommittedEvents.length; i < len; i++) {
                    event = eventstream.uncommittedEvents[i];
                    event.commitId = id;
                    event.commitSequence = i;
                    event.commitStamp = new Date();
                    event.streamRevision = currentRevision++;
                }
                
                self.storage.addEvents(eventstream.uncommittedEvents, function(err) {
                    if (err) callback(err); 
                });

                // push to undispatchedQueue
                eventstream.uncommittedEvents.forEach(function(event) {
                    self.undispatchedEventsQueue.push(event);
                    self.log('added new event: ' + JSON.stringify(event));
                });
                
                // move to events and remove uncommitted events.
                eventstream.events = eventstream.events.concat(eventstream.uncommittedEvents);
                eventstream.uncommittedEvents = [];
            }],
            
            function (err) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, eventstream);
                }
            }
        );
    },
    
    // This function returns all events.
    getAllEvents: function(callback) {
        
        if (this.hasConfigurationErrors(callback)) return;
            
        this.storage.getAllEvents(function(events) {
            var payloads = [];
            
            for(var i in events) {
                payloads.push(events[i].payload);
            }
            
            if (typeof callback === 'function') {
                callback(null, payloads);
            }
        });            
    }
}

PublishWorker = function(store) {
    this.publishingInterval = store.options.publishingInterval || 100;
    this.storage = store.storage;
    this.publisher = store.publisher;
    this.logger = store.logger;
    this.undispatchedEventsQueue = store.undispatchedEventsQueue;
}

PublishWorker.prototype = {
 
    log: function(msg, level) {
        if (!this.logger)
            return;
            
        if (level) {
            this.logger[level](msg);
        } else {
            this.logger.info(msg);
        }    
    },

    // This function is an "infinite loop" which publisher all undispatched events.
    start: function() {
    
        if (!(this.storage && this.publisher)) return;
        
        var self = this;
        
        this.storage.getUndispatchedEvents(function(err, events) {
            
            for (i = 0, len = events.length; i < len; i++) {
                self.undispatchedEventsQueue.push(events[i]);
            }
                        
            var worker = {};
            
            worker.start = function() {
                worker.process = setInterval(function() {
                    var queue = self.undispatchedEventsQueue || []
                      , event;
                        
                    if (worker.isRunning)
                        return;
                        
                    worker.isRunning = true;
                    
                    (function next(e) {
                    
                        var process = function(event, next) {
                        
                            // Publish it now...
                            self.publisher.publish(event.payload);
                            self.log('SEND EVENT ' + event.payload.event + ' to bus: ' + JSON.stringify(event.payload));
                                
                            // ...and set the published event to dispatched.
                            self.storage.setEventToDispatched(event, function(err) {
                                if (err) {
                                    self.log(err, 'error');
                                } else {
                                    self.log('set event: "' + event.payload.event + ' (' + event.payload.id + ')" to dispatched');
                                }
                            });
                        
                            next();
                        };
                        
                        var log = function(e) {
                            if (e) {
                                self.log(e, 'error');
                            }
                        };
                        
                        (!e && queue.length) ? process(queue.shift(), next) : log(e);
                    }
                    )();
                    
                    worker.isRunning = false;
                    
                }, self.publishingInterval);
            };
            
            worker.start();
        });
    }
}

/*******************************************
* EventStream Class
*/
var EventStream = function(store, streamId, events) {
    this.store = store;
    this.streamId = streamId;
    this.events = events || [];
    this.uncommittedEvents = [];
};

EventStream.prototype = {

    // This function returns the current stream revision.
    currentRevision: function() {
        var rev = 0;
        
        for (i = 0, len = this.events.length; i < len; i++) {
            if (this.events[i].streamRevision > rev) {
                rev = this.events[i].streamRevision;
            }
        }
            
        return rev;
    },

    // This function adds an event to the uncommited events.
    addEvent: function(event) {
        var evt = new Event(this.streamId, event);
        this.uncommittedEvents.push(evt);
    },
    
    // This function calls the commit on the event store.
    createSnapshot: function(data, callback) {    
        var snapshot = new Snapshot(null, this.streamId, this.currentRevision(), data);
        return this.store.commitSnapshot(snapshot, callback);
    },
    
    // This function calls the commit on the event store.
    commit: function() {
        return this.store.commit(this);
    }
}

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
* Snapshot Class
*/
var Snapshot = function(id, streamId, revision, data) {
    this.id = id;
    this.streamId = streamId;
    this.revision = revision;
    this.data = data;
};

/*******************************************
* Public Classes
*/
Store.Event = Event;
Store.EventStream = EventStream;
