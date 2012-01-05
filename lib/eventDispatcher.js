//     lib/eventDispatcher.js v0.3.0
//     (c) 2012 Kaba AG, MIC AWM; under MIT License
//     (by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// The eventdispatchers task is to publish undispatched events to the used publisher 
// implementation.     
// __Example:__
//
//      var eventDispatcher = require('./eventDispatcher') 
//      var dispatcher = eventDispatcher.create(this);
//      
//      // start the instance
//      dispatcher.start()

var root = this
  , dispatcher
  , EventDispatcher;

if (typeof exports !== 'undefined') {
    dispatcher = exports;
} else {
    dispatcher = root.eventDispatcher = {};
}

dispatcher.VERSION = '0.3.0';

// Create an instance by passing in the eventstore
dispatcher.create = function(store) {
    return new EventDispatcher(store);
};

// ## EventDispatcher
EventDispatcher = function(store) {
    this.publishingInterval = store.options.publishingInterval || 100;
    this.storage = store.storage;
    this.publisher = store.publisher;
    this.logger = store.logger;
    this.undispatchedEventsQueue = [];
};

EventDispatcher.prototype = {
    
    // __log:__ Just a helper function to shorten logging calls
    log: function(msg, level) {
        if (!this.logger)
            return;
            
        if (level) {
            this.logger[level](msg);
        } else {
            this.logger.info(msg);
        }    
    },
    
    // __addUndispatchedEvents:__ queues the passed in events for dispatching
    addUndispatchedEvents: function(events) {
        var self = this;
        events.forEach(function(event) {
            self.undispatchedEventsQueue.push(event);
        });
    },
    
    // __start:__ starts the instance to publish all undispatched events in queue.
    start: function() {
    
        if (!(this.storage && this.publisher)) return;
        
        var self = this;
        
        // get all _undispatched_ events from storage and queue them 
        // befor all other events passed in by the _addUndispatchedEvents_ function.
        this.storage.getUndispatchedEvents(function(err, events) {
            
            if (events) {
                for (i = 0, len = events.length; i < len; i++) {
                    self.undispatchedEventsQueue.push(events[i]);
                }
            }
                        
            var worker = {};
            
            // starts the worker by using an interval loop
            worker.start = function() {
                worker.process = setInterval(function() {
                    var queue = self.undispatchedEventsQueue || []
                      , event;
                        
                    // if the last loop is still in progress leave this loop
                    if (worker.isRunning)
                        return;
                        
                    worker.isRunning = true;
                    
                    (function next(e) {
                    
                        // dipatch one event in queue and call the _next_ callback, which 
                        // will call _process_ for the next undispatched event in queue.
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
                        
                        // serial _process_ all events in queue
                        (!e && queue.length) ? process(queue.shift(), next) : log(e);
                    }
                    )();
                    
                    worker.isRunning = false;
                    
                }, self.publishingInterval);
            };
            
            // fire things off
            worker.start();
        });
    }
};