var root = this
  , dispatcher
  , EventDispatcher;

if (typeof exports !== 'undefined') {
    dispatcher = exports;
} else {
    dispatcher = root.eventDispatcher = {};
}

dispatcher.VERSION = '0.0.1';

// Create new instance
dispatcher.create = function(store) {
    return new EventDispatcher(store);
};

EventDispatcher = function(store) {
    this.publishingInterval = store.options.publishingInterval || 100;
    this.storage = store.storage;
    this.publisher = store.publisher;
    this.logger = store.logger;
    this.undispatchedEventsQueue = [];
};

EventDispatcher.prototype = {
        
    log: function(msg, level) {
        if (!this.logger)
            return;
            
        if (level) {
            this.logger[level](msg);
        } else {
            this.logger.info(msg);
        }    
    },
    
    addUndispatchedEvents: function(events) {
        var self = this;
        events.forEach(function(event) {
            self.undispatchedEventsQueue.push(event);
        });
    },
    
    // This function is an "infinite loop" which publisher all undispatched events.
    start: function() {
    
        if (!(this.storage && this.publisher)) return;
        
        var self = this;
        
        this.storage.getUndispatchedEvents(function(err, events) {
            
            if (events) {
                for (i = 0, len = events.length; i < len; i++) {
                    self.undispatchedEventsQueue.push(events[i]);
                }
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
};