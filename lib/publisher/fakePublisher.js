//     lib/publisher/fakePublisher.js v0.0.1
//     (c) 2011 Kaba AG, CC EAC; under MIT License
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

fakePublisher.VERSION = '0.0.1';

// create new publisher instance
fakePublisher.createPublisher = function(options) {
    return new Publisher(options);
};

// Publisher
var Publisher = function(options) {
    this.published = [];
    this.subscriptions = [];
};

Publisher.prototype.subscribe = function(callback) {
    this.subscriptions.push({callback: callback});
};

Publisher.prototype.publish = function(event) {    
    for (var subscriber in this.subscriptions) {
        subscriber.callback(event);
    }
    
    this.published.push(event);
};

