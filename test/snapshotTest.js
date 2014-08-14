var expect = require('expect.js'),
  Snapshot = require('../lib/snapshot');

describe('Snapshot', function () {

  describe('creating an instance', function () {

    describe('without passing an id', function () {

      it('it should throw an error', function () {

        expect(function() {
          new Snapshot();
        }).to.throwError(/id/);

      });

    });

    describe('without passing an object', function () {

      it('it should throw an error', function () {

        expect(function() {
          new Snapshot('myId', {});
        }).to.throwError(/object/);

      });

    });

    describe('without passing an aggregateId in the object', function () {

      it('it should throw an error', function () {

        expect(function() {
          new Snapshot('myId', {});
        }).to.throwError(/object.aggregateId/);

      });

    });

    describe('without passing a data property in the object', function () {

      it('it should throw an error', function () {

        expect(function() {
          new Snapshot('myId', { aggregateId: 'myAggId' });
        }).to.throwError(/object.data/);

      });

    });

    describe('passing all needed values', function () {

      it('it should return a valid object', function () {

        var snap = null;

        expect(function() {
          snap = new Snapshot('myId', { aggregateId: 'myAggId', data: 'snap'});
        }).not.to.throwError();

        expect(snap.id).to.eql('myId');
        expect(snap.aggregateId).to.eql('myAggId');
        expect(snap.streamId).to.eql('myAggId');
        expect(snap.data).to.eql('snap');

      });

    });

    describe('passing all values', function () {

      it('it should return a valid object', function () {
        
        var snap = null;

        expect(function() {
          snap = new Snapshot('myId', { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont',
                                            data: 'snap', version: 3, revision: 24 });
        }).not.to.throwError();

        expect(snap.id).to.eql('myId');
        expect(snap.aggregateId).to.eql('myAggId');
        expect(snap.streamId).to.eql('myAggId');
        expect(snap.aggregate).to.eql('myAgg');
        expect(snap.context).to.eql('myCont');
        expect(snap.data).to.eql('snap');
        expect(snap.version).to.eql(3);
        expect(snap.revision).to.eql(24);

      });

    });

  });

});
