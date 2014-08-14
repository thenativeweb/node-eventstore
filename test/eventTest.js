var expect = require('expect.js'),
  Event = require('../lib/event');

describe('Event', function () {
  
  describe('creating an instance', function () {
    
    describe('without passing an eventstream', function () {
      
      it('it should throw an error', function () {
        
        expect(function() {
          new Event();
        }).to.throwError(/eventstream/);
        
      });
      
    });

    describe('without passing an event', function () {

      it('it should throw an error', function () {

        expect(function() {
          new Event({});
        }).to.throwError(/event/);

      });

    });

    describe('without passing an aggregateId in the eventstream', function () {

      it('it should throw an error', function () {

        expect(function() {
          new Event({}, {});
        }).to.throwError(/eventstream.aggregateId/);

      });

    });

    describe('without passing in the eventstream with its uncommittedEvents property', function () {

      it('it should throw an error', function () {

        expect(function() {
          new Event({ aggregateId: 'myAggId' }, {});
        }).to.throwError(/eventstream.uncommittedEvents/);

      });

    });
    
    describe('passing all needed values', function () {
      
      it('it should return a valid object', function () {

        expect(function() {
          var uncommitedEvents = [];
          var evt = new Event({ aggregateId: 'myAggId', uncommittedEvents: uncommitedEvents }, { data: 'event'});
          expect(evt.aggregateId).to.eql('myAggId');
          expect(evt.streamId).to.eql('myAggId');
          expect(evt.payload.data).to.eql('event');
          expect(uncommitedEvents.length).to.eql(1);
          expect(uncommitedEvents[0]).to.eql(evt);
        }).not.to.throwError();
        
        
      });
      
    });
    
  });
  
});
