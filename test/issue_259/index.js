'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('../utils/testUtils.js');

const START_AT_HOST = require('../!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../!testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do some stuff', () => {
        gameplayRoom = require('../../lib/features/realtimePvp/gameplayRoom.js');
    });
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    var cachedMatchmakingStrategy;

    describe('The stuff', () => {
        it('Should do some stuff', () => {
            cachedMatchmakingStrategy = goblinBase.matchmakingConfig.strategy;
            goblinBase.matchmakingConfig.strategy = 'open';
        });
        it('Should add cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/mmAllInOne.js')
                .requireAsCloudFunction('./cloudFunctions/mutateProfile.js')
                .requireAsCloudFunction('./cloudFunctions/setFictiveProfileData.js')
                .requireAsCloudFunction('./cloudFunctions/setTheRecordsForMm.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpAutoCloseHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpCheckGameOver.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpConnectionHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpGameOverHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpGeneratePayload.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpInitGameplayModel.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpTurnHandler.js')
                .requireAsCloudFunction('./cloudFunctions/setTheRecordsForMm.js')
                ._reinitCloudFunctions(done);
        });
    });

    var unicorns = [], gClientIds = [], gClientSecrets = [],
        gameroomSeqs = [];

    describe('The cases', () => {
        describe('Case with real-life player', () => {
            it('Should drop databases', done => {
                unicorns = [];
                gClientIds = [];
                gClientSecrets = [];
                gameroomSeqs = [];
                async.parallel([
                    cb => testUtils.removeAllDocuments(cb),
                    cb => opClients.getSessionsClient().getRedis().flushall(cb)
                ], done);
            });

            _(2).times(n => {
                it(`Should create new account #${n + 1}`, done => {
                    let callbackFn = (err, response, body, _unicorn) => {
                        expect(err).to.be.equal(null);
                        expect(response.statusCode).to.equal(200);

                        expect(body).to.have.property('unicorn');

                        expect(body).to.have.property('unicorn');
                        expect(body).to.have.property('gClientId');
                        expect(body).to.have.property('gClientSecret');

                        unicorns.push(_unicorn);
                        gClientIds.push(body.gClientId);
                        gClientSecrets.push(body.gClientSecret);

                        done();
                    };

                    testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
                });
                it(`Should create new profile #${n + 1}`, done => {
                    let callbackFn = (err, response) => {
                        expect(err).to.be.equal(null);
                        expect(response.statusCode).to.equal(200);

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
                });
            });

            it('Should call function setTheRecordsForMm', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.setTheRecordsForMm', null, unicorns[0], callbackFn);
            });
            it('Should call function setFictiveProfileData', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.setFictiveProfileData', null, unicorns[0], callbackFn);
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

            var gameroomHost, gameroomPort,
                bookingKey1, bookingKey2;

            it('Both players should do matchmaking by calling mmAllInOne', done => {
                let callbackFn = (err, responses) => {
                    expect(err).to.be.a('null');
                    expect(responses[0][0].statusCode).to.be.equal(200);
                    expect(responses[1][0].statusCode).to.be.equal(200);

                    var body1 = responses[0][1],
                        body2 = responses[1][1];

                    expect(body1).to.have.property('address');
                    expect(body1.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                    expect(body1).to.have.property('key');
                    expect(body2).to.have.property('address');
                    expect(body2.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                    expect(body2).to.have.property('key');

                    expect(body1.key).to.not.be.equal(body2.key);

                    gameroomHost = body1.address.hosts.asDomain;
                    gameroomPort = body1.address.ports.ws;
                    bookingKey1 = body1.key;
                    bookingKey2 = body2.key;

                    done();
                };

                async.parallel([
                    cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmAllInOne', null, unicorns[0], cb),
                    cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmAllInOne', null, unicorns[1], cb)
                ], callbackFn);
            });
            it('First player should release booking in gameroom', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({ c: 0, m: 'GR: pair allocated. Wait for opponent' });

                    done();
                };

                testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
            });
            it('Second player should release booking in gameroom', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({ c: 1, m: 'GR: pair formed' });

                    done();
                };

                testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
            });
            it('First player should set payload', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({ c: 1, m: 'GR: payload set' });

                    done();
                };

                testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload a' }, bookingKey1, callbackFn);
            });
            it('Second player should set payload', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({ c: 2, m: 'GR: set ready' });

                    done();
                };

                testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload b' }, bookingKey2, callbackFn);
            });
        });
    });

    describe('More stuff', () => {
        it('Should undo some stuff', () => {
            goblinBase.matchmakingConfig.strategy = cachedMatchmakingStrategy;
        });
    });
});
describe('After stuff', () => {
    it('Should revert default cloud functions', done => {
        goblinBase
            .requireAsCloudFunction('../defaultCloudFunctions/pvpAutoCloseHandler.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpCheckGameOver.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpConnectionHandler.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpDisconnectionHandler.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpGameOverHandler.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpGeneratePayload.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpInitGameplayModel.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpTurnHandler.js')
            ._reinitCloudFunctions(done);
    });
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