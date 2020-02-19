'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do some stuff', () => {
        gameplayRoom = require('../lib/features/realtimePvp/gameplayRoom.js');
    });
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    const N = 3;

    it('Should drop databases', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });

    var roomOccupation;

    it('Should get room occupation by hand ¯\\_(ツ)_/¯', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            roomOccupation = +response;
            expect(roomOccupation).to.be.equal(goblinBase.pvpConfig.pairsCapacity);

            done();
        };

        opClients.getGameplayRoomClient().getOccupation([goblinBase.pvpConfig.pairsCapacity], callbackFn);
    });
    it('Should add room to matchmaking by hand', done => {
        let callbackFn = err => {
            expect(err).to.be.a('null');

            done();
        };

        var ipAddress = gameplayRoom._getIpAddress();
        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, 3000, '-1', roomOccupation], callbackFn);
    });

    var unicorn1, unicorn2;

    it('Should add account 1', done => {
        let callbackFn = (err, response, body, _unicorn) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            unicorn1 = _unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
    });
    it('Should add profile 1', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
    });
    it('Should add account 2', done => {
        let callbackFn = (err, response, body, _unicorn) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            unicorn2 = _unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
    });
    it('Should add profile 2', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
    });
    it('Should post record for first player', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
            value: 2,
            segment: 'segma'
        }, null, unicorn1, callbackFn);
    });
    it('Should post record for second player', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
            value: 3,
            segment: 'segma'
        }, null, unicorn2, callbackFn);
    });
    it('Both players should find each other', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            expect(body1).to.deep.equal(body2);
            expect(body2).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

            done();
        };

        async.parallel([
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
        ], callbackFn);
    });
    it(`Both players should call /acceptMatch ${N} times in parallel`, done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');

            _(N).times(n => {
                expect(responses[0][n][0].statusCode).to.be.equal(200);
                expect(responses[1][n][0].statusCode).to.be.equal(200);
            });

            var bodies1 = [], bodies2 = [];

            _(N).times(n => {
                bodies1.push(responses[0][n][1]);
                bodies2.push(responses[1][n][1]);
            });

            expect(bodies1[0].c === 2 || bodies2[0].c === 2).to.be.equal(true);

            if(bodies1[0].c === 2){
                expect(bodies1[0]).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });
                expect(bodies2[0]).to.have.property('c', 3);
                expect(bodies2[0]).to.have.property('address');
                expect(bodies2[0]).to.have.property('key');
            } else {
                expect(bodies2[0]).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });
                expect(bodies1[0]).to.have.property('c', 3);
                expect(bodies1[0]).to.have.property('address');
                expect(bodies1[0]).to.have.property('key');
            }

            _(N - 1).times(n => {
                n = n + 1;
                expect(bodies1[n]).to.have.property('c', 3);
                expect(bodies1[n]).to.have.property('address');
                expect(bodies1[n]).to.have.property('key');
                expect(bodies2[n]).to.have.property('c', 3);
                expect(bodies2[n]).to.have.property('address');
                expect(bodies2[n]).to.have.property('key');
            });

            done();
        };

        var theFirst = [], theSecond = [];
        _(N).times(() => {
            theFirst.push(
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, cb)
            );
            theSecond.push(
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, cb)
            );
        });
        async.parallel([
            cb => async.series(theFirst, cb),
            cb => async.series(theSecond, cb)
        ], callbackFn);
    });
});
describe('After stuff', () => {
    it('Should clean utils cache', () => {
        testUtils.clearCache();
    });
    it('Should do clean', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});