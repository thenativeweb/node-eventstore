//     lib/eventDispatcher.js v0.5.0
//     (c)(by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// The eventdispatchers task is to publish undispatched events to the used publisher 
// implementation.     
// __Example:__
//
//      dispatcher = new EventDispatcher(options);
//      dispatcher.useLogger(logger)
//                .usePublisher(publisher)
//                .useStorage(storage)
//                .start();

var EventDispatcher;

// ## EventDispatcher
EventDispatcher = function(options) {
    this.options = options;
    this.publishingInterval = this.options.publishingInterval || 100;
    this.publisher = null;
    this.logger = null;
    this.undispatchedEventsQueue = [];
};

EventDispatcher.prototype = {

    // __useLogger:__ use this function to to inject the logger.
    //
    // `eventDispatcher.useLogger(logger)`
    //
    // - __logger:__ the logger that should be injected
    useLogger: function(logger) {
        
        this.logger = logger;

        return this;

    },

    // __usePublisher:__ use this function to to inject the publisher.
    //
    // `eventDispatcher.usePublisher(publisher)`
    //
    // - __publisher:__ the publisher that should be injected
    usePublisher: function(publisher) {
        
        this.publisher = publisher;

        return this;

    },

    // __useStorage:__ use this function to to inject the storage.
    //
    // `eventDispatcher.useStorage(storage)`
    //
    // - __storageModule:__ the storage that should be injected
    useStorage: function(storage) {
        
        this.storage = storage;

        return this;

    },
    
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
                for (var i = 0, len = events.length; i < len; i++) {
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

module.exports = EventDispatcher;