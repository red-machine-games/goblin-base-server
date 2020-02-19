'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    WebSocket = require('ws'),
    crypto = require('crypto');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('../utils/testUtils.js');

const START_AT_HOST = require('../!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../!testEntryPoint.js').START_AT_PORT;

var ErrorResponse = require('../../lib/objects/ErrorResponse.js');

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
describe('The cases', () => {
    const _PLATFORM_VERSION = 'ios;0.0.2';

    var cachedMatchmakingStrategy;

    describe('The stuff', () => {
        it('Should do some stuff', () => {
            cachedMatchmakingStrategy = goblinBase.matchmakingConfig.strategy;
            goblinBase.matchmakingConfig.strategy = 'open';
        });
    });

    describe('Adding cloud functions', () => {
        it('Should you know what', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/mmAcceptPvpMatch.js')
                .requireAsCloudFunction('./cloudFunctions/mmAllInOne.js')
                .requireAsCloudFunction('./cloudFunctions/mmCheckPvpNoSearch.js')
                .requireAsCloudFunction('./cloudFunctions/mmDeclinePvpMatch.js')
                .requireAsCloudFunction('./cloudFunctions/mmSearchPvpOpponent.js')
                .requireAsCloudFunction('./cloudFunctions/mmSearchPvpOpponentByLadder.js')
                .requireAsCloudFunction('./cloudFunctions/mmStopSearchingForAnyPvpOpponent.js')
                .requireAsCloudFunction('./cloudFunctions/mmWaitForPvpOpponentToAccept.js')
                .requireAsCloudFunction('./cloudFunctions/pvpAutoCloseHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvpCheckGameOver.js')
                .requireAsCloudFunction('./cloudFunctions/pvpConnectionHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvpGameOverHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvpGeneratePayload.js')
                .requireAsCloudFunction('./cloudFunctions/pvpInitGameplayModel.js')
                .requireAsCloudFunction('./cloudFunctions/pvpTurnHandler.js')
                .requireAsCloudFunction('./cloudFunctions/readProfileData.js')
                .requireAsCloudFunction('./cloudFunctions/setTheRecordsForMm.js')
                .requireAsCloudFunction('./cloudFunctions/setTheRecordsForMmSingle.js')
                ._reinitCloudFunctions(done);
        });
    });

    describe('Case #1', () => {
        var unicorns = [], gClientIds = [], gClientSecrets = [];

        _(2).times(n => {
            it(`Should create new account #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

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

        it('Should call function mmCheckPvpNoSearch', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ check: { stat: 'MM: neither in queue nor in battle', c: -1 } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmCheckPvpNoSearch', null, unicorns[0], callbackFn);
        });
        it('Both players should find each other with function mmSearchPvpOpponent', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({ search: { stat: 'MM: accept or decline the game', c: 1 } });

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmSearchPvpOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmSearchPvpOpponent', null, unicorns[1], cb)
            ], callbackFn);
        });
        it('First player should accept the match with mmAcceptPvpMatch', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ theAccept: { stat: 'MM: waiting for opponent to accept the game', c: 2 } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmAcceptPvpMatch', null, unicorns[0], callbackFn);
        });

        var gameroomHost, gameroomPort,
            bookingKey1, bookingKey2;

        it('Second player should accept the match with mmAcceptPvpMatch and first player should wait for it with mmWaitForPvpOpponentToAccept', done => {
            var firstIsOkay = false, secondIsOkay = false,
                keyOne;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('theWait');
                expect(body.theWait).to.have.property('stat', 'MM: gameroom allocated');
                expect(body.theWait).to.have.property('c', 3);
                expect(body.theWait).to.have.property('address');
                expect(body.theWait.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body.theWait).to.have.property('key');

                if(!gameroomHost || !gameroomPort){
                    gameroomHost = body.theWait.address.hosts.asDomain;
                    gameroomPort = body.theWait.address.ports.ws;
                }
                bookingKey1 = body.theWait.key;

                if(keyOne){
                    expect(body.theWait.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.theWait.key;
                }

                firstIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };
            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('theAccept');
                expect(body.theAccept).to.have.property('stat', 'MM: gameroom allocated');
                expect(body.theAccept).to.have.property('c', 3);
                expect(body.theAccept).to.have.property('address');
                expect(body.theAccept.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body.theAccept).to.have.property('key');

                if(!gameroomHost || !gameroomPort){
                    gameroomHost = body.theAccept.address.hosts.asDomain;
                    gameroomPort = body.theAccept.address.ports.ws;
                }
                bookingKey2 = body.theAccept.key;

                if(keyOne){
                    expect(body.theAccept.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.theAccept.key;
                }

                secondIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmWaitForPvpOpponentToAccept', null, unicorns[0], callbackFn1);
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmAcceptPvpMatch', null, unicorns[1], callbackFn2);
        });
        it(`Should wait ~6000 ms`, done => {
            setTimeout(done, goblinBase.matchmakingConfig.numericConstants.gameroomBookingTtl);
        });
        it('First player should try to release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(347, 'Didn\'t found booking'));

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
        });
        it('Second player should try to release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(347, 'Didn\'t found booking'));

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
        });
    });
    describe('Case #2', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        var unicorns = [], gClientIds = [], gClientSecrets = [];

        _(2).times(n => {
            it(`Should create new account #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

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

        it('Should call function mmCheckPvpNoSearch', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ check: { stat: 'MM: neither in queue nor in battle', c: -1 } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmCheckPvpNoSearch', null, unicorns[0], callbackFn);
        });
        it('Both players should find each other with function mmSearchPvpOpponent', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({ search: { stat: 'MM: accept or decline the game', c: 1 } });

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmSearchPvpOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmSearchPvpOpponent', null, unicorns[1], cb)
            ], callbackFn);
        });
        it('First player should accept the match with mmAcceptPvpMatch', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ theAccept: { stat: 'MM: waiting for opponent to accept the game', c: 2 } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmAcceptPvpMatch', null, unicorns[0], callbackFn);
        });

        var gameroomHost, gameroomPort,
            bookingKey1, bookingKey2;

        it('Second player should accept the match with mmAcceptPvpMatch and first player should wait for it with mmWaitForPvpOpponentToAccept', done => {
            var firstIsOkay = false, secondIsOkay = false,
                keyOne;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('theWait');
                expect(body.theWait).to.have.property('stat', 'MM: gameroom allocated');
                expect(body.theWait).to.have.property('c', 3);
                expect(body.theWait).to.have.property('address');
                expect(body.theWait.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body.theWait).to.have.property('key');

                if(!gameroomHost || !gameroomPort){
                    gameroomHost = body.theWait.address.hosts.asDomain;
                    gameroomPort = body.theWait.address.ports.ws;
                }
                bookingKey1 = body.theWait.key;

                if(keyOne){
                    expect(body.theWait.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.theWait.key;
                }

                firstIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };
            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('theAccept');
                expect(body.theAccept).to.have.property('stat', 'MM: gameroom allocated');
                expect(body.theAccept).to.have.property('c', 3);
                expect(body.theAccept).to.have.property('address');
                expect(body.theAccept.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body.theAccept).to.have.property('key');

                if(!gameroomHost || !gameroomPort){
                    gameroomHost = body.theAccept.address.hosts.asDomain;
                    gameroomPort = body.theAccept.address.ports.ws;
                }
                bookingKey2 = body.theAccept.key;

                if(keyOne){
                    expect(body.theAccept.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.theAccept.key;
                }

                secondIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmWaitForPvpOpponentToAccept', null, unicorns[0], callbackFn1);
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmAcceptPvpMatch', null, unicorns[1], callbackFn2);
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
        it(`Should wait ~5000 ms`, done => {
            setTimeout(done, goblinBase.pvpConfig.numericConstants.timeToConnectPairMs);
        });
        it('First player should try to set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                if(body.index === 422){
                    expect(body).to.deep.equal(new ErrorResponse(422, 'Didn\'t found booking'));
                } else {
                    expect(body).to.deep.equal(new ErrorResponse(354, 'Didn\'t found pair'));
                }

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, callbackFn);
        });
        it('Second player should try to set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                if(body.index === 422){
                    expect(body).to.deep.equal(new ErrorResponse(422, 'Didn\'t found booking'));
                } else {
                    expect(body).to.deep.equal(new ErrorResponse(354, 'Didn\'t found pair'));
                }

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, callbackFn);
        });
    });
    describe('Case #3', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        var unicorns = [], gClientIds = [], gClientSecrets = [];

        _(2).times(n => {
            it(`Should create new account #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

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

        it('Should call function mmCheckPvpNoSearch', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ check: { stat: 'MM: neither in queue nor in battle', c: -1 } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmCheckPvpNoSearch', null, unicorns[0], callbackFn);
        });
        it('Both players should find each other with function mmSearchPvpOpponent', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({ search: { stat: 'MM: accept or decline the game', c: 1 } });

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmSearchPvpOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmSearchPvpOpponent', null, unicorns[1], cb)
            ], callbackFn);
        });
        it('First player should accept the match with mmAcceptPvpMatch', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ theAccept: { stat: 'MM: waiting for opponent to accept the game', c: 2 } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmAcceptPvpMatch', null, unicorns[0], callbackFn);
        });

        var gameroomHost, gameroomPort,
            bookingKey1, bookingKey2;

        it('Second player should accept the match with mmAcceptPvpMatch and first player should wait for it with mmWaitForPvpOpponentToAccept', done => {
            var firstIsOkay = false, secondIsOkay = false,
                keyOne;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('theWait');
                expect(body.theWait).to.have.property('stat', 'MM: gameroom allocated');
                expect(body.theWait).to.have.property('c', 3);
                expect(body.theWait).to.have.property('address');
                expect(body.theWait.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body.theWait).to.have.property('key');

                if(!gameroomHost || !gameroomPort){
                    gameroomHost = body.theWait.address.hosts.asDomain;
                    gameroomPort = body.theWait.address.ports.ws;
                }
                bookingKey1 = body.theWait.key;

                if(keyOne){
                    expect(body.theWait.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.theWait.key;
                }

                firstIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };
            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('theAccept');
                expect(body.theAccept).to.have.property('stat', 'MM: gameroom allocated');
                expect(body.theAccept).to.have.property('c', 3);
                expect(body.theAccept).to.have.property('address');
                expect(body.theAccept.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body.theAccept).to.have.property('key');

                if(!gameroomHost || !gameroomPort){
                    gameroomHost = body.theAccept.address.hosts.asDomain;
                    gameroomPort = body.theAccept.address.ports.ws;
                }
                bookingKey2 = body.theAccept.key;

                if(keyOne){
                    expect(body.theAccept.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.theAccept.key;
                }

                secondIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmWaitForPvpOpponentToAccept', null, unicorns[0], callbackFn1);
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmAcceptPvpMatch', null, unicorns[1], callbackFn2);
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

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, callbackFn);
        });
        it('Second player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: set ready' });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, callbackFn);
        });
        it(`Should wait ~15000 ms`, done => {
            setTimeout(done, goblinBase.matchmakingConfig.numericConstants.playerInGameroomTtl);
        });
        it('First player should try to set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(422, 'Didn\'t found booking'));

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey1, callbackFn);
        });
        it('Second player should try to set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(422, 'Didn\'t found booking'));

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
        });
    });
    describe('Case #4', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        var unicorns = [], gClientIds = [], gClientSecrets = [];

        _(2).times(n => {
            it(`Should create new account #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

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

        it('Should call function mmCheckPvpNoSearch', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ check: { stat: 'MM: neither in queue nor in battle', c: -1 } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmCheckPvpNoSearch', null, unicorns[0], callbackFn);
        });
        it('Both players should find each other with function mmSearchPvpOpponent', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({ search: { stat: 'MM: accept or decline the game', c: 1 } });

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmSearchPvpOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmSearchPvpOpponent', null, unicorns[1], cb)
            ], callbackFn);
        });
        it('First player should accept the match with mmAcceptPvpMatch', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ theAccept: { stat: 'MM: waiting for opponent to accept the game', c: 2 } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmAcceptPvpMatch', null, unicorns[0], callbackFn);
        });

        var gameroomHost, gameroomPort,
            bookingKey1, bookingKey2;

        it('Second player should accept the match with mmAcceptPvpMatch and first player should wait for it with mmWaitForPvpOpponentToAccept', done => {
            var firstIsOkay = false, secondIsOkay = false,
                keyOne;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('theWait');
                expect(body.theWait).to.have.property('stat', 'MM: gameroom allocated');
                expect(body.theWait).to.have.property('c', 3);
                expect(body.theWait).to.have.property('address');
                expect(body.theWait.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body.theWait).to.have.property('key');

                if(!gameroomHost || !gameroomPort){
                    gameroomHost = body.theWait.address.hosts.asDomain;
                    gameroomPort = body.theWait.address.ports.ws;
                }
                bookingKey1 = body.theWait.key;

                if(keyOne){
                    expect(body.theWait.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.theWait.key;
                }

                firstIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };
            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('theAccept');
                expect(body.theAccept).to.have.property('stat', 'MM: gameroom allocated');
                expect(body.theAccept).to.have.property('c', 3);
                expect(body.theAccept).to.have.property('address');
                expect(body.theAccept.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body.theAccept).to.have.property('key');

                if(!gameroomHost || !gameroomPort){
                    gameroomHost = body.theAccept.address.hosts.asDomain;
                    gameroomPort = body.theAccept.address.ports.ws;
                }
                bookingKey2 = body.theAccept.key;

                if(keyOne){
                    expect(body.theAccept.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.theAccept.key;
                }

                secondIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmWaitForPvpOpponentToAccept', null, unicorns[0], callbackFn1);
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmAcceptPvpMatch', null, unicorns[1], callbackFn2);
        });

        var wsConnection1, wsConnection2;

        it('First player should try to connect ws with gameroom', done => {
            let callbackFn = () => {
                if(openIsOk && closeIsOkay){
                    expect(theCode).to.be.equal(4400);
                    expect(theMessage).to.deep.equal(new ErrorResponse(374, 'Didn\'t found pair'));

                    done();
                }
            };

            var ws = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey1}&pv=${_PLATFORM_VERSION}`),
                openIsOk = false, closeIsOkay = false, theCode, theMessage;

            ws.on('error', err => done(err));
            ws.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            ws.on('message', () => done(new Error('WTF 2')));
            ws.on('close', (code, reason) => {
                if(!closeIsOkay){
                    closeIsOkay = true;
                    theCode = code;
                    theMessage = JSON.parse(reason);
                    callbackFn();
                } else {
                    done(new Error('WTF 3'));
                }
            });
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
        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if(openIsOk && messageIsOkay){
                    expect(theMessage).to.deep.equal({ c: 0, m: 'GR: pair allocated. Wait for opponent' });

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');

                    done();
                }
            };

            wsConnection1 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey1}&pv=${_PLATFORM_VERSION}`);
            var openIsOk = false, messageIsOkay = false, theMessage;

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection1.on('message', message => {
                if(!messageIsOkay){
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection1.on('close', () => done(new Error('WTF 3')));
        });
        it('Second player should release booking and first player should get knowledgeable about it', done => {
            var releaseIsOkay = false, wsMessageIsOkay = false, theMessage;

            let generalCallbackFn = () => {
                if(releaseIsOkay && wsMessageIsOkay){
                    expect(theMessage).to.deep.equal({ p: 1, m: 'PRGS: all players connected' });

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');
                    done();
                }
            };

            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('close', () => done(new Error('WTF 2')));
            wsConnection1.on('error', err => done(err));
            wsConnection1.on('message', msg => {
                if(!wsMessageIsOkay){
                    theMessage = JSON.parse(msg);
                    wsMessageIsOkay = true;
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 3'));
                }
            });

            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 1, m: 'GR: pair formed' });

                releaseIsOkay = true;
                generalCallbackFn();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
        });
        it('Second player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if(openIsOk && messageIsOkay){
                    expect(theMessage).to.deep.equal({ c: 1, m: 'GR: pair formed' });

                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                }
            };

            wsConnection2 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey2}&pv=${_PLATFORM_VERSION}`);
            var openIsOk = false, messageIsOkay = false, theMessage;

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection2.on('message', message => {
                if(!messageIsOkay){
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 3')));
        });
        it('First player should set payload', done => {
            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', () => done(new Error('WTF 2')));
            wsConnection1.on('close', () => done(new Error('WTF 3')));
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 4')));
            wsConnection2.on('message', () => done(new Error('WTF 5')));
            wsConnection2.on('close', () => done(new Error('WTF 6')));

            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 1, m: 'GR: payload set' });

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');
                wsConnection2.removeAllListeners('error');
                wsConnection2.removeAllListeners('open');
                wsConnection2.removeAllListeners('message');
                wsConnection2.removeAllListeners('close');

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, {
                player: 1, payload: 'alpha'
            }, bookingKey1, callbackFn);
        });
        it('Second player should set payload', done => {
            var setPayloadIsOkay = false, firstMessageIsOkay = false, secondMessageIsOkay = false,
                message1, message2;

            let generalCallbackFn = () => {
                if(setPayloadIsOkay && firstMessageIsOkay && secondMessageIsOkay){
                    expect(message1).to.deep.equal({ p: 2, m: 'PRGS: all payloads set', isA: true, oppPayload: { some: 'payload b' } });
                    expect(message2).to.deep.equal({ p: 2, m: 'PRGS: all payloads set', isA: false, oppPayload: { some: 'payload a' } });

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');
                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                }
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', msg => {
                if(!firstMessageIsOkay){
                    firstMessageIsOkay = true;
                    message1 = JSON.parse(msg);
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection1.on('close', () => done(new Error('WTF 3')));
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 4')));
            wsConnection2.on('message', msg => {
                if(!secondMessageIsOkay){
                    secondMessageIsOkay = true;
                    message2 = JSON.parse(msg);
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 5'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 6')));

            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: set ready' });

                setPayloadIsOkay = true;
                generalCallbackFn();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, {
                player: 2, payload: 'beta'
            }, bookingKey2, callbackFn);
        });
        it('First player should set ready', done => {
            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', () => done(new Error('WTF 2')));
            wsConnection1.on('close', () => done(new Error('WTF 3')));
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 4')));
            wsConnection2.on('message', () => done(new Error('WTF 5')));
            wsConnection2.on('close', () => done(new Error('WTF 6')));

            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload b' } });

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');
                wsConnection2.removeAllListeners('error');
                wsConnection2.removeAllListeners('open');
                wsConnection2.removeAllListeners('message');
                wsConnection2.removeAllListeners('close');

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey1, callbackFn);
        });

        var preGameNow;

        it('First player should send pre game message', done => {
            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', msg => {
                preGameNow = JSON.parse(msg).preGame;
                expect(preGameNow).to.be.a('number');
                expect(preGameNow).to.be.above(0);

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');

                done();
            });
            wsConnection1.on('close', () => done(new Error('WTF 3')));

            var message = { m: '123' },
                sign = `/${JSON.stringify(message)}${bookingKey1}default`;
            message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
            wsConnection1.send(JSON.stringify(message));
        });
        it('Second player should send pre game message', done => {
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 1')));
            wsConnection2.on('message', msg => {
                let imsg = JSON.parse(msg).preGame;
                expect(imsg).to.be.a('number');
                expect(imsg).to.be.above(preGameNow);

                wsConnection2.removeAllListeners('error');
                wsConnection2.removeAllListeners('open');
                wsConnection2.removeAllListeners('message');
                wsConnection2.removeAllListeners('close');

                done();
            });
            wsConnection2.on('close', () => done(new Error('WTF 3')));

            var message = { m: '321' },
                sign = `/${JSON.stringify(message)}${bookingKey2}default`;
            message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
            wsConnection2.send(JSON.stringify(message));
        });
        it('First player should try to make ws connection with gameroom', done => {
            let callbackFn = () => {
                if(openIsOk && closeIsOkay){
                    expect(theCode).to.be.equal(4400);
                    expect(theMessage).to.deep.equal(new ErrorResponse(375, 'Locket by exc. lock'));

                    done();
                }
            };

            var ws = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey1}&pv=${_PLATFORM_VERSION}`),
                openIsOk = false, closeIsOkay = false, theCode, theMessage;

            ws.on('error', err => done(err));
            ws.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            ws.on('message', () => done(new Error('WTF 2')));
            ws.on('close', (code, reason) => {
                if(!closeIsOkay){
                    closeIsOkay = true;
                    theCode = code;
                    theMessage = JSON.parse(reason);
                    callbackFn();
                } else {
                    done(new Error('WTF 3'));
                }
            });
        });
        it('Second player should try to make ws connection with gameroom', done => {
            let callbackFn = () => {
                if(openIsOk && closeIsOkay){
                    expect(theCode).to.be.equal(4400);
                    expect(theMessage).to.deep.equal(new ErrorResponse(375, 'Locket by exc. lock'));

                    done();
                }
            };

            var ws = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey2}&pv=${_PLATFORM_VERSION}`),
                openIsOk = false, closeIsOkay = false, theCode, theMessage;

            ws.on('error', err => done(err));
            ws.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            ws.on('message', () => done(new Error('WTF 2')));
            ws.on('close', (code, reason) => {
                if(!closeIsOkay){
                    closeIsOkay = true;
                    theCode = code;
                    theMessage = JSON.parse(reason);
                    callbackFn();
                } else {
                    done(new Error('WTF 3'));
                }
            });
        });
        it('Second player should set ready', done => {
            var setReadyIsOkay = false, firstMessageIsOkay = false, secondMessageIsOkay = false, thirdMessageIsOkay = false,
                firstMessage, secondMessage, thirdMessage;

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', msg => {
                msg = JSON.parse(msg);
                if(msg.p === 3 && !firstMessageIsOkay){
                    firstMessageIsOkay = true;
                    firstMessage = msg;
                    generalCallbackFn();
                } else if(msg.p === 4 && !thirdMessageIsOkay){
                    thirdMessageIsOkay = true;
                    thirdMessage = msg;
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection1.on('close', () => done(new Error('WTF 3')));
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 4')));
            wsConnection2.on('message', msg => {
                if(!secondMessageIsOkay){
                    secondMessageIsOkay = true;
                    secondMessage = JSON.parse(msg);
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 5'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 6')));

            let generalCallbackFn = () => {
                if(setReadyIsOkay && firstMessageIsOkay && secondMessageIsOkay && thirdMessageIsOkay){
                    expect(firstMessage).to.deep.equal(secondMessage);
                    expect(secondMessage).to.deep.equal({ p: 3, m: 'PRGS: all players ready' });

                    expect(thirdMessage).to.have.property('randomSeed');
                    expect(thirdMessage).to.have.property('startTs');
                    expect(thirdMessage).to.have.property('isA');
                    delete thirdMessage.randomSeed;
                    delete thirdMessage.startTs;
                    delete thirdMessage.isA;
                    expect(thirdMessage).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { some: 'payload b' } });

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');
                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                }
            };

            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('randomSeed');
                expect(body).to.have.property('startTs');
                expect(body).to.have.property('isA');
                delete body.randomSeed;
                delete body.startTs;
                delete body.isA;
                expect(body).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { some: 'payload a' } });

                if(!setReadyIsOkay){
                    setReadyIsOkay = true;
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 7'));
                }
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
        });
        it(`Should wait ~2000 ms and both sockets should close`, done => {
            var now = _.now(), firstCloseIsOkay = false, secondCloseIsOkay = false, sendIsOkay = false;

            let generalCallbackFn = () => {
                if(firstCloseIsOkay && secondCloseIsOkay && sendIsOkay){
                    expect(_.now()).to.be.above(now + goblinBase.pvpConfig.numericConstants.socketTtlMs);

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');
                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                }
            };

            function doSend(){
                if(!firstCloseIsOkay){
                    let message = { m: '123' },
                        sign = `/${JSON.stringify(message)}${bookingKey1}default`;
                    message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
                    wsConnection1.send(JSON.stringify(message));
                }
                if(!secondCloseIsOkay){
                    let message = { m: '321' },
                        sign = `/${JSON.stringify(message)}${bookingKey2}default`;
                    message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
                    wsConnection2.send(JSON.stringify(message));
                }
                sendIsOkay = true;
                generalCallbackFn();
            }

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', () => done(new Error('WTF 2')));
            wsConnection1.on('close', () => {
                expect(_.now()).to.be.above(now + goblinBase.pvpConfig.numericConstants.socketTtlMs - 1);
                if(!firstCloseIsOkay){
                    firstCloseIsOkay = true;
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 3'));
                }
            });
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 4')));
            wsConnection2.on('message', () => done(new Error('WTF 5')));
            wsConnection2.on('close', () => {
                expect(_.now()).to.be.above(now + goblinBase.pvpConfig.numericConstants.socketTtlMs - 50);
                if(!secondCloseIsOkay){
                    secondCloseIsOkay = true;
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 6'));
                }
            });

            setTimeout(doSend, goblinBase.pvpConfig.numericConstants.socketTtlMs);
        });
        it('First player should connect ws with gameroom again', done => {
            let callbackFn = () => {
                if(openIsOk && messageIsOkay){
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('from');
                    delete theMessage.from;
                    delete theMessage.state.model.mdl.randomSeed;
                    delete theMessage.state.model.mdl.startTs;
                    expect(theMessage).to.have.property('paused', 1);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 1,
                            "model": {
                                "isA": 1,
                                "playerTurnA": 0,
                                "playerTurnB": 0,
                                "mdl": {
                                    "model": {
                                        "plrA": {
                                            "some": "payload a"
                                        },
                                        "plrB": {
                                            "some": "payload b"
                                        },
                                        "plrAsq": 0,
                                        "plrBsq": 0
                                    }
                                }
                            }
                        }
                    });

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');

                    done();
                }
            };

            wsConnection1 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey1}&pv=${_PLATFORM_VERSION}`);
            var openIsOk = false, messageIsOkay = false, theMessage;

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection1.on('message', message => {
                if(!messageIsOkay){
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection1.on('close', () => done(new Error('WTF 3')));
        });
        it('Second player should connect ws with gameroom again', done => {
            let callbackFn = () => {
                if(openIsOk && messageIsOkay){
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('from');
                    delete theMessage.from;
                    expect(theMessage).to.have.property('to');
                    delete theMessage.to;
                    delete theMessage.state.model.mdl.randomSeed;
                    delete theMessage.state.model.mdl.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 0,
                            "model": {
                                "isA": 0,
                                "playerTurnA": 0,
                                "playerTurnB": 0,
                                "mdl": {
                                    "model": {
                                        "plrA": {
                                            "some": "payload a"
                                        },
                                        "plrB": {
                                            "some": "payload b"
                                        },
                                        "plrAsq": 0,
                                        "plrBsq": 0
                                    }
                                }
                            }
                        }
                    });

                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                }
            };

            wsConnection2 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey2}&pv=${_PLATFORM_VERSION}`);
            var openIsOk = false, messageIsOkay = false, theMessage;

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection2.on('message', message => {
                if(!messageIsOkay){
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 3')));
        });
        it('First player should send invalid ping message', done => {
            let callbackFn = msg => {
                expect(JSON.parse(msg)).to.deep.equal(new ErrorResponse(381, 'Invalid message'));

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');

                done();
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', callbackFn);
            wsConnection1.on('close', () => done(new Error('WTF 2')));

            let message = { ping: 1337, hello: 1 },
                sign = `/${JSON.stringify(message)}${bookingKey1}default`;
            message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
            wsConnection1.send(JSON.stringify(message));
        });
        it('Second player should send invalid battle message', done => {
            let callbackFn = msg => {
                expect(JSON.parse(msg)).to.deep.equal(new ErrorResponse(383, 'Invalid message'));

                wsConnection2.removeAllListeners('error');
                wsConnection2.removeAllListeners('open');
                wsConnection2.removeAllListeners('message');
                wsConnection2.removeAllListeners('close');

                done();
            };

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 1')));
            wsConnection2.on('message', callbackFn);
            wsConnection2.on('close', () => done(new Error('WTF 2')));

            let message = { mysq: 1, m: { hello: 1 }, hello: 'world' },
                sign = `/${JSON.stringify(message)}${bookingKey2}default`;
            message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
            wsConnection2.send(JSON.stringify(message));
        });
        it('First player should send ping message 1', done => {
            let callbackFn = msg => {
                expect(JSON.parse(msg)).to.deep.equal({ yrAvg: 10, oppAvg: 0 });

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');

                done();
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', callbackFn);
            wsConnection1.on('close', () => done(new Error('WTF 2')));

            wsConnection1.send(JSON.stringify({ ping: 10 }));
        });
        it('Second player should send ping message 1', done => {
            let callbackFn = msg => {
                expect(JSON.parse(msg)).to.deep.equal({ yrAvg: 8, oppAvg: 10 });

                wsConnection2.removeAllListeners('error');
                wsConnection2.removeAllListeners('open');
                wsConnection2.removeAllListeners('message');
                wsConnection2.removeAllListeners('close');

                done();
            };

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 1')));
            wsConnection2.on('message', callbackFn);
            wsConnection2.on('close', () => done(new Error('WTF 2')));

            wsConnection2.send(JSON.stringify({ ping: 8 }));
        });
        it('First player should send ping message 2', done => {
            let callbackFn = msg => {
                expect(JSON.parse(msg)).to.deep.equal({ yrAvg: 8, oppAvg: 8 });

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');

                done();
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', callbackFn);
            wsConnection1.on('close', () => done(new Error('WTF 2')));

            wsConnection1.send(JSON.stringify({ ping: 6 }));
        });
        it('Second player should send ping message 2', done => {
            let callbackFn = msg => {
                expect(JSON.parse(msg)).to.deep.equal({ yrAvg: 9, oppAvg: 8 });

                wsConnection2.removeAllListeners('error');
                wsConnection2.removeAllListeners('open');
                wsConnection2.removeAllListeners('message');
                wsConnection2.removeAllListeners('close');

                done();
            };

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 1')));
            wsConnection2.on('message', callbackFn);
            wsConnection2.on('close', () => done(new Error('WTF 2')));

            wsConnection2.send(JSON.stringify({ ping: 10 }));
        });

        const N = 14;

        _(N).times(n => {
            it(`First player should send battle message #${n + 1} and second should receive it`, done => {
                let callbackFn = msg => {
                    expect(JSON.parse(msg)).to.deep.equal({ oppsq: n + 1, m: { oppsq: n + 1, m: { pvpTurn: 'alpha', hello: 'world' } } });

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');
                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                };

                wsConnection1.on('error', err => done(err));
                wsConnection1.on('open', () => done(new Error('WTF 1')));
                wsConnection1.on('message',() => done(new Error('WTF 2')));
                wsConnection1.on('close', () => done(new Error('WTF 3')));

                wsConnection2.on('error', err => done(err));
                wsConnection2.on('open', () => done(new Error('WTF 4')));
                wsConnection2.on('message', callbackFn);
                wsConnection2.on('close', () => done(new Error('WTF 5')));

                let message = { mysq: n + 1, m: { hello: 'world' } },
                    sign = `/${JSON.stringify(message)}${bookingKey1}default`;
                message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
                wsConnection1.send(JSON.stringify(message));
            });
        });
        _(N).times(n => {
            it(`Second player should send battle message #${n + 1} and first should receive it`, done => {
                let callbackFn = msg => {
                    expect(JSON.parse(msg)).to.deep.equal({ oppsq: n + 1, m: { oppsq: n + 1, m: { pvpTurn: 'beta', russo: 'turisto' } } });

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');
                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                };

                wsConnection1.on('error', err => done(err));
                wsConnection1.on('open', () => done(new Error('WTF 1')));
                wsConnection1.on('message', callbackFn);
                wsConnection1.on('close', () => done(new Error('WTF 2')));

                wsConnection2.on('error', err => done(err));
                wsConnection2.on('open', () => done(new Error('WTF 3')));
                wsConnection2.on('message', () => done(new Error('WTF 4')));
                wsConnection2.on('close', () => done(new Error('WTF 5')));

                let message = { mysq: n + 1, m: { russo: 'turisto' } },
                    sign = `/${JSON.stringify(message)}${bookingKey2}default`;
                message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
                wsConnection2.send(JSON.stringify(message));
            });
        });
        it('First player should send battle message with wrong sequence counter', done => {
            let callbackFn = msg => {
                expect(JSON.parse(msg)).to.deep.equal({ error: new ErrorResponse(368, 'Invalid sequence'), mysq: 0, mysqShouldBe: 15 });

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');
                wsConnection2.removeAllListeners('error');
                wsConnection2.removeAllListeners('open');
                wsConnection2.removeAllListeners('message');
                wsConnection2.removeAllListeners('close');

                done();
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', callbackFn);
            wsConnection1.on('close', () => done(new Error('WTF 2')));
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 3')));
            wsConnection2.on('message', () => done(new Error('WTF 4')));
            wsConnection2.on('close', () => done(new Error('WTF 5')));

            let message = { mysq: 0, m: { hello: 'world1' } },
                sign = `/${JSON.stringify(message)}${bookingKey1}default`;
            message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
            wsConnection1.send(JSON.stringify(message));
        });
        it('Second player should send battle message with wrong sequence counter', done => {
            let callbackFn = msg => {
                expect(JSON.parse(msg)).to.deep.equal({ error: new ErrorResponse(368, 'Invalid sequence'), mysq: 1337, mysqShouldBe: 15 });

                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('message');
                wsConnection1.removeAllListeners('close');
                wsConnection2.removeAllListeners('error');
                wsConnection2.removeAllListeners('open');
                wsConnection2.removeAllListeners('message');
                wsConnection2.removeAllListeners('close');

                done();
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', () => done(new Error('WTF 2')));
            wsConnection1.on('close', () => done(new Error('WTF 3')));
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 4')));
            wsConnection2.on('message', callbackFn);
            wsConnection2.on('close', () => done(new Error('WTF 5')));

            let message = { mysq: 1337, m: { hello: 'world2' } },
                sign = `/${JSON.stringify(message)}${bookingKey2}default`;
            message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
            wsConnection2.send(JSON.stringify(message));
        });
        it('Second player should finish battle', done => {
            var firstCloseIsOkay = false, secondCloseIsOkay = false,
                firstCode, firstMessage, secondCode, secondMessage;

            let generalCallbackFn = () => {
                if(firstCloseIsOkay && secondCloseIsOkay){
                    expect(firstCode).to.be.equal(secondCode);
                    expect(secondCode).to.be.equal(4200);
                    expect(firstMessage).to.deep.equal(secondMessage);
                    expect(secondMessage).to.deep.equal({ gameIsOver: true, finalm: { gameIsOver: true, finalm: { m: { hello: 'world3', pvpTurn: 'beta' }, asq: 14, bsq: 15 } } });

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');
                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                }
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', () => done(new Error('WTF 2')));
            wsConnection1.on('close', (code, reason) => {
                if(!firstCloseIsOkay){
                    firstCloseIsOkay = true;
                    firstCode = code;
                    firstMessage = JSON.parse(reason);
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 3'))
                }
            });

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 4')));
            wsConnection2.on('message', () => done(new Error('WTF 5')));
            wsConnection2.on('close', (code, reason) => {
                if(!secondCloseIsOkay){
                    secondCloseIsOkay = true;
                    secondCode = code;
                    secondMessage = JSON.parse(reason);
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 6'))
                }
            });

            let message = { mysq: 15, m: { hello: 'world3' } },
                sign = `/${JSON.stringify(message)}${bookingKey2}default`;
            message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
            wsConnection2.send(JSON.stringify(message));
        });
        it('Lets wait 1000 ms', done => {
            setTimeout(done, 1000);
        });

        var pvpBattlesListingCached;

        it('First player should list pvp battles', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('now');
                expect(body.l.length).to.be.equal(1);
                expect(body.l[0]).to.have.property('hida');
                expect(body.l[0]).to.have.property('hidb');
                expect(body.l[0]).to.have.property('cat');
                expect(body.l[0]).to.have.property('dsp');
                expect(body.l[0].dsp).to.deep.equal({ hello: 'world' });

                delete body.now;
                pvpBattlesListingCached = body;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorns[0], callbackFn);
        });
        it('Second player should list pvp battles', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                delete body.now;
                expect(body).to.deep.equal(pvpBattlesListingCached);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorns[1], callbackFn);
        });
        it('Should call function readProfileData', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ soTheFirst: 1, soTheSycound: 1, terrify: null, youth: null });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.readProfileData', null, unicorns[0], callbackFn);
        });
    });
    describe('Case #5', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        var unicorns = [], gClientIds = [], gClientSecrets = [];

        _(2).times(n => {
            it(`Should create new account #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

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
        it('First player should set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload b' } });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey1, callbackFn);
        });
        it('Second player should set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('randomSeed');
                expect(body).to.have.property('startTs');
                expect(body).to.have.property('isA');
                delete body.randomSeed;
                delete body.startTs;
                delete body.isA;
                expect(body).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { some: 'payload a' } });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
        });

        var wsConnection1, wsConnection2;

        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if(openIsOk && messageIsOkay){
                    expect(theMessage).to.have.property('c', 4);
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('isA', 1);
                    expect(theMessage.state.model).to.have.property('mdl');
                    expect(theMessage.state.model.mdl).to.have.property('model');
                    expect(theMessage.state.model.mdl.model).to.deep.equal({
                        "plrA": {
                            "some": "payload a"
                        },
                        "plrAsq": 0,
                        "plrB": {
                            "some": "payload b"
                        },
                        "plrBsq": 0
                    });

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');

                    done();
                }
            };

            wsConnection1 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey1}&pv=${_PLATFORM_VERSION}`);
            var openIsOk = false, messageIsOkay = false, theMessage;

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection1.on('message', message => {
                if(!messageIsOkay){
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection1.on('close', () => done(new Error('WTF 3')));
        });
        it('Second player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if(openIsOk && messageIsOkay){
                    expect(theMessage).to.have.property('c', 4);
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('isA', 0);
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state.model).to.have.property('mdl');
                    expect(theMessage.state.model.mdl.model).to.deep.equal({
                        "plrA": {
                            "some": "payload a"
                        },
                        "plrAsq": 0,
                        "plrB": {
                            "some": "payload b"
                        },
                        "plrBsq": 0
                    });

                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                }
            };

            wsConnection2 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey2}&pv=${_PLATFORM_VERSION}`);
            var openIsOk = false, messageIsOkay = false, theMessage;

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection2.on('message', message => {
                if(!messageIsOkay){
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 3')));
        });
        it(`Should wait and get an auto close messages`, done => {
            var firstPingInterval = setInterval(() => wsConnection1.send(JSON.stringify({ ping: 1 })), 1000),
                code1, message1, gamePaused, secondClosed;

            let generalCallbackFn = () => {
                if(code1 && message1 && gamePaused && secondClosed){
                    expect(code1).to.be.equal(4200);

                    message1 = JSON.parse(message1);
                    expect(message1).to.deep.equal({ c: -1, m: 'GR: auto gameover', dsp: { loooser: 'a' }});

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');
                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    clearInterval(firstPingInterval);

                    done();
                }
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', msg => {
                msg = JSON.parse(msg);
                if(msg.p === 4 && msg.c === 3 && msg.m === 'GR: opponent disconnected' && msg.paused === 1){
                    if(!gamePaused){
                        gamePaused = true;
                    } else {
                        done(new Error('WTF 2'))
                    }
                }
            });
            wsConnection1.on('close', (code, message) => {
                code1 = code;
                message1 = message;
                generalCallbackFn();
            });
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 3')));
            wsConnection2.on('message', () => done(new Error('WTF 4')));
            wsConnection2.on('close', code => {
                if(code === 1006){
                    secondClosed = true;
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 4'));
                }
            });
        });

        var pvpBattlesListingCached;

        it('First player should list pvp battles', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('now');
                expect(body.l.length).to.be.equal(1);
                expect(body.l[0]).to.have.property('hida');
                expect(body.l[0]).to.have.property('hidb');
                expect(body.l[0]).to.have.property('cat');
                expect(body.l[0]).to.have.property('dsp');
                expect(body.l[0]).to.have.property('auto', true);
                expect(body.l[0].dsp).to.have.property('looo', 'sers');
                expect(body.l[0].dsp).to.have.property('lagA');
                expect(body.l[0].dsp).to.have.property('lagB');

                expect(body.l[0].dsp.lagA).to.be.a('number');
                expect(body.l[0].dsp.lagB).to.be.a('number');

                delete body.now;
                pvpBattlesListingCached = body;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorns[0], callbackFn);
        });
        it('Second player should list pvp battles', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                delete body.now;
                expect(body).to.deep.equal(pvpBattlesListingCached);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorns[1], callbackFn);
        });
        it('Should call function readProfileData', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ soTheFirst: null, soTheSycound: null, terrify: 1, youth: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.readProfileData', null, unicorns[0], callbackFn);
        });
    });

    describe('The stuff', () => {
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