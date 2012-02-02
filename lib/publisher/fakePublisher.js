//     lib/publisher/fakePublisher.js v0.4.0
//     (c) 2012 Kaba AG, MIC AWM; under MIT License
//     (by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// A __fake__ implemetation for publishing. __Use only for development purpose.__   
// For production role your own implementation providing a _publish_ function.
var root = this
  , fakePublisher;

if (typeof exports !== 'undefined') {
    fakePublisher = exports;
} else {
    fakePublisher = root.fakePublisher = {};
}

fakePublisher.VERSION = '0.3.0';

// create new publisher instance
fakePublisher.createPublisher = function(options) {
    return new Publisher(options);
};

// Publisher
var Publisher = function(options) {
    this.published = [];
    this.subscriptions = [];
};

Publisher.prototype = {

    // __subscribe:__ subscribes for all events.
    //
    // `pub.subscribe(callback)`
    //
    // - __callback:__ `function(event){}`
    subscribe: function(callback) {
        this.subscriptions.push({callback: callback});
    },

    // __publish:__ publishes the event.
    //
    // `pub.publish(event)`
    //
    // - event:__ the event that must be published
    publish: function(event) {    
        for (var subscriber in this.subscriptions) {
            subscriber.callback(event);
        }
        
        this.published.push(event);
    }

};

