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
describe('The cases', () => {
    describe('Spam to catch the floating issue', () => {
        const N = 50;

        _(N).times(n => {
            it(`Should drop databases #${n + 1}`, done => {
                async.parallel([
                    cb => testUtils.removeAllDocuments(cb),
                    cb => opClients.getSessionsClient().getRedis().flushall(cb)
                ], done);
            });

            var roomOccupation;

            it(`Should get room occupation by hand ¯\\_(ツ)_/¯ #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');

                    roomOccupation = +response;
                    expect(roomOccupation).to.be.equal(goblinBase.pvpConfig.pairsCapacity);

                    done();
                };

                opClients.getGameplayRoomClient().getOccupation([goblinBase.pvpConfig.pairsCapacity], callbackFn);
            });
            it(`Should add room to matchmaking by hand #${n + 1}`, done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                var ipAddress = gameplayRoom._getIpAddress();
                opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, 3000, '-1', roomOccupation], callbackFn);
            });

            var unicorn1, unicorn2;

            it(`Should add account 1 #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    unicorn1 = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it(`Should add profile 1 #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn1, callbackFn);
            });
            it(`Should add account 2 #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    unicorn2 = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it(`Should add profile 2 #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn2, callbackFn);
            });
            it(`Should post record for first player #${n + 1}`, done => {
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
            it(`Should post record for second player #${n + 1}`, done => {
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

            it(`Both players should find each other and accept the match and all in parallel #${n}`, done => {
                let callbackFn = (err, responses) => {
                    expect(err).to.be.a('null');
                    expect(responses[0][0][0].statusCode).to.be.equal(200);
                    expect(responses[0][1][0].statusCode).to.be.equal(200);
                    expect(responses[0][2][0].statusCode).to.be.equal(200);
                    expect(responses[1][0][0].statusCode).to.be.equal(200);
                    expect(responses[1][1][0].statusCode).to.be.equal(200);
                    expect(responses[1][2][0].statusCode).to.be.equal(200);

                    var body1 = responses[0][0][1],
                        body2 = responses[0][1][1],
                        body3 = responses[0][2][1],
                        body4 = responses[1][0][1],
                        body5 = responses[1][1][1],
                        body6 = responses[1][2][1];

                    expect(body1).to.deep.equal(body4);
                    expect(body4).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });
                    expect(body2.c === 2 || body5.c === 2).to.be.equal(true);

                    if(body2.c === 2){
                        expect(body2).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });
                        expect(body5).to.have.property('c', 3);
                        expect(body5).to.have.property('address');
                        expect(body5).to.have.property('key');
                    } else {
                        expect(body5).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });
                        expect(body2).to.have.property('c', 3);
                        expect(body2).to.have.property('address');
                        expect(body2).to.have.property('key');
                    }

                    expect(body3).to.have.property('stat', 'MM: gameroom allocated');
                    expect(body3).to.have.property('c', 3);
                    expect(body3).to.have.property('address');
                    expect(body3).to.have.property('key');
                    expect(body6).to.have.property('stat', 'MM: gameroom allocated');
                    expect(body6).to.have.property('c', 3);
                    expect(body6).to.have.property('address');
                    expect(body6).to.have.property('key');

                    done();
                };

                async.parallel([
                    cb => async.series([
                        cbb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cbb),
                        cbb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, cbb),
                        cbb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, cbb)
                    ], cb),
                    cb => async.series([
                        cbb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cbb),
                        cbb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, cbb),
                        cbb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn2, cbb)
                    ], cb)
                ], callbackFn);
            });
        });
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