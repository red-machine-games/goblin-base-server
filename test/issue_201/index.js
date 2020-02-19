'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('../utils/testUtils.js');

var ErrorResponse = require('../../lib/objects/ErrorResponse.js');

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
describe('The cases', () => {
    var cachedMatchmakingStrategy;

    describe('Stuff', () => {
        it('Should do some stuff', () => {
            cachedMatchmakingStrategy = goblinBase.matchmakingConfig.strategy;
            goblinBase.matchmakingConfig.strategy = 'open';
        });
        it('Should add cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/setTheRecordsForMm.js')
                .requireAsCloudFunction('./cloudFunctions/theMm.js')
                .requireAsCloudFunction('./cloudFunctions/theMmWithInterferingSearch.js')
                .requireAsCloudFunction('./cloudFunctions/theMmWithNextSearch.js')
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

        it('Should do that mm by calling theMm custom function', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    searching: { c: 0, stat: 'MM: searching' },
                    checkPvp1: { c: 0, stat: 'MM: searching' },
                    checkPvp2: { c: -1, stat: 'MM: neither in queue nor in battle' },
                    handSelected: { c: 1, stat: 'MM: accept or decline the game' }
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.theMm', {
                timeout: goblinBase.matchmakingConfig.numericConstants.timeForSearchMs - goblinBase.matchmakingConfig.numericConstants.longPollingColdResponseAfterMs + 10
            }, unicorns[0], callbackFn);
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

        it('Should do that mm by calling theMmWithNextSearch custom function', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    searching: { c: 0, stat: 'MM: searching' },
                    checkPvp1: { c: 0, stat: 'MM: searching' },
                    checkPvp2: { c: -1, stat: 'MM: neither in queue nor in battle' },
                    searching2: { c: 0, stat: 'MM: searching' }
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.theMmWithNextSearch', {
                timeout: goblinBase.matchmakingConfig.numericConstants.timeForSearchMs - goblinBase.matchmakingConfig.numericConstants.longPollingColdResponseAfterMs + 10
            }, unicorns[0], callbackFn);
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

        it('Should try to mm by calling theMmWithInterferingSearch custom function', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(500);

                expect(body).to.deep.equal(new ErrorResponse(629, 'Concurrent wait prevention', { cfName: 'theMmWithInterferingSearch' }));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.theMmWithInterferingSearch', null, unicorns[0], callbackFn);
        });
    });

    describe('Stuff', () => {
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