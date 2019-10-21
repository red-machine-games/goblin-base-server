'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./testEntryPoint.js').START_AT_PORT;

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
    const N = 4;

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

    var mmRadCached;

    it('Should set matchmaking limit radius', () => {
        mmRadCached = goblinBase.matchmakingConfig.limitLeaderboardRadius;
        goblinBase.matchmakingConfig.limitLeaderboardRadius = 2;
    });

    var unicorns = [];

    _(N).times(n => {
        it(`Should add account ${n + 1}`, done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorns.push(_unicorn);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it(`Should add profile ${n + 1}`, done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
        });
        it(`Should post record for player ${n + 1}`, done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: n % 2 === 0 ? 13 : 14,
                segment: 'segma'
            }, null, unicorns[n], callbackFn);
        });
    });
    it(`Players 1 and 2 should find each other`, done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            delete body1.opppid;
            delete body2.opppid;

            expect(body1).to.deep.equal(body2);
            expect(body2).to.deep.equal({stat: 'MM: accept or decline the game', c: 1});

            done();
        };

        async.parallel([
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], cb),
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[1], cb)
        ], callbackFn);
    });
    it(`Players 3 and 4 should find each other`, done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            delete body1.opppid;
            delete body2.opppid;

            expect(body1).to.deep.equal(body2);
            expect(body2).to.deep.equal({stat: 'MM: accept or decline the game', c: 1});

            done();
        };

        async.parallel([
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[2], cb),
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[3], cb)
        ], callbackFn);
    });

    it('Should unset matchmaking limit radius', () => {
        goblinBase.matchmakingConfig.limitLeaderboardRadius = mmRadCached;
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