var expect = require('expect.js'),
  EventStream = require('../lib/eventStream');

describe('EventStream', function () {

  describe('creating an instance', function () {

    describe('without passing an eventstore', function () {

      it('it should throw an error', function () {

        expect(function() {
          new EventStream({});
        }).to.throwError(/eventstore/);

      });

    });

    describe('without passing a query object', function () {

      it('it should throw an error', function () {

        expect(function() {
          new EventStream({ commit: function(){} });
        }).to.throwError(/query/);

      });

    });

    describe('without passing an aggregateId in the query object', function () {

      it('it should throw an error', function () {

        expect(function() {
          new EventStream({ commit: function(){} }, {});
        }).to.throwError(/query.aggregateId/);

      });

    });

    describe('without passing an aggregateId in the query object', function () {

      it('it should throw an error', function () {

        expect(function() {
          new EventStream({ commit: function(){} }, { aggregateId: 'myAggId' }, [{ streamRevision: 0 }, {}]);
        }).to.throwError(/streamRevision/);

      });

    });

    describe('passing all needed values', function () {

      it('it should return a valid object', function () {

        function commit () {}
        var stream = null;

        expect(function() {
          stream = new EventStream({ commit: commit }, { aggregateId: 'myAggId' });
        }).not.to.throwError();

        expect(stream.eventstore.commit).to.eql(commit);
        expect(stream.aggregateId).to.eql('myAggId');
        expect(stream.streamId).to.eql('myAggId');
        expect(stream.events).to.be.an('array');
        expect(stream.events.length).to.eql(0);
        expect(stream.uncommittedEvents).to.be.an('array');
        expect(stream.uncommittedEvents.length).to.eql(0);
        expect(stream.lastRevision).to.eql(-1);
        expect(stream.eventstore.commit).to.eql(commit);

      });

    });

    describe('passing all values', function () {

      it('it should return a valid object', function () {

        function commit () {}
        var stream = null;

        expect(function() {
          stream = new EventStream({ commit: commit }, { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
                                    [{ one: 'event', streamRevision: 5 }]);
        }).not.to.throwError();

        expect(stream.eventstore.commit).to.eql(commit);
        expect(stream.aggregateId).to.eql('myAggId');
        expect(stream.streamId).to.eql('myAggId');
        expect(stream.aggregate).to.eql('myAgg');
        expect(stream.context).to.eql('myCont');
        expect(stream.events).to.be.an('array');
        expect(stream.events.length).to.eql(1);
        expect(stream.events[0].one).to.eql('event');
        expect(stream.uncommittedEvents).to.be.an('array');
        expect(stream.uncommittedEvents.length).to.eql(0);
        expect(stream.lastRevision).to.eql(5);
        expect(stream.eventstore.commit).to.eql(commit);

      });

    });
    
    describe('with some events', function () {

      function commit () {}
      var evts = [{ one: 'event', streamRevision: 0 }, { one: 'three', streamRevision: 2 }, { one: 'two', streamRevision: 1 }];
      
      it('it should return a valid object', function () {

        var stream = new EventStream({ commit: commit }, { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
          evts);
        
        expect(stream.lastRevision).to.eql(2);
        expect(stream.events).to.be.an('array');
        expect(stream.events.length).to.eql(3);
        expect(stream.events[0]).to.eql(evts[0]);
        expect(stream.events[1]).to.eql(evts[2]);
        expect(stream.events[2]).to.eql(evts[1]);
        
      });
      
      describe('calling currentRevision', function () {
        
        it('it should return the correct revision', function () {

          var stream = new EventStream({ commit: commit }, { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
            evts);

          expect(stream.lastRevision).to.eql(2);
          expect(stream.currentRevision()).to.eql(2);
          expect(stream.lastRevision).to.eql(2);
          
        });
        
      });
      
      describe('calling addEvent', function () {
        
        var stream;
        
        before(function () {
          stream = new EventStream({ commit: commit }, { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
            evts);
        });
        
        it('it should add the passed event to the uncommitted event array', function () {

          stream.addEvent({ 'new': 'event' });
          
          expect(stream.events.length).to.eql(3);
          expect(stream.uncommittedEvents.length).to.eql(1);
          expect(stream.uncommittedEvents[0].payload['new']).to.eql('event');
          
        });
        
      });

      describe('calling addEvents', function () {

        var stream;

        beforeEach(function () {
          stream = new EventStream({ commit: commit }, { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
            evts);
        });

        it('it should add the passed events to the uncommitted event array', function () {

          stream.addEvents([{ 'new1': 'event1' }, { 'new2': 'event2' }]);

          expect(stream.events.length).to.eql(3);
          expect(stream.uncommittedEvents.length).to.eql(2);
          expect(stream.uncommittedEvents[0].payload['new1']).to.eql('event1');
          expect(stream.uncommittedEvents[1].payload['new2']).to.eql('event2');

        });
        
        describe('with a non array', function () {

          it('it should add the passed events to the uncommitted event array', function () {

            expect(function() {
              stream.addEvents({});
            }).to.throwError(/array/);

          });
          
        });

      });
      
      describe('calling commit', function () {

        var commitCalledArg;
        function commitCheck (str, clb) {
          commitCalledArg = str;
          clb(null);
        }
        var stream;

        beforeEach(function () {
          commitCalledArg = null;
          stream = new EventStream({ commit: commitCheck }, { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
            evts);
        });

        it('it should add the passed events to the uncommitted event array', function (done) {

          stream.addEvents([{ 'new1': 'event1' }, { 'new2': 'event2' }]);

          stream.commit(function(err) {
            expect(err).not.to.be.ok();
            expect(commitCalledArg).to.eql(stream);
            
            done();
          })

        });
        
      });
      
    });

  });

});
