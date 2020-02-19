'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    WebSocket = require('ws');

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
        describe('Case #1', () => {
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

            var playerPids;

            it('Should get players\' pids', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs).to.not.be.a('null');
                    expect(docs.length).to.be.equal(2);

                    playerPids = [docs[0]._id.toString(), docs[1]._id.toString()];

                    done();
                };

                async.parallel([
                    cb => Profile.findOne({ humanId: 1 }, { projection: { _id: 1 } }, cb),
                    cb => Profile.findOne({ humanId: 2 }, { projection: { _id: 1 } }, cb)
                ], callbackFn);
            });

            it('Should call function setSingleRecordForMm', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.setSingleRecordForMm', null, unicorns[0], callbackFn);
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

            it('Should push some values into matchmaking redis', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                async.series([
                    cb => opClients.getMatchmakingClient().getRedis().hmset(
                        'grmb:{\"hosts\":{\"asIP\":\"127.127.127.127\",\"asDomain\":\"hello.world.com\"},\"ports\":{\"wss\":7331,\"ws\":7333}}:39evlr5-23jnt37',
                        'upd', '1551179713309',
                        "opp", playerPids[1],
                        "stat", "0",
                        "pid", playerPids[0],
                        "opbot", "1",
                        "bpd", "-1",
                        cb
                    ),
                    cb => opClients.getMatchmakingClient().getRedis().hmset(
                        `qplr:${playerPids[0]}`,
                        "stat", "4",
                        "grip", "{\"hosts\":{\"asIP\":\"127.127.127.127\",\"asDomain\":\"hello.world.com\"},\"ports\":{\"wss\":7331,\"ws\":7333}}",
                        "upd", "1551179717512",
                        "pid", playerPids[0],
                        "ky", "39evlr5-23jnt37",
                        "opbot", "1",
                        "opp", playerPids[1],
                        cb
                    )
                ], callbackFn);
            });
            it('Should call pvp.checkBattleNoSearch and receive data about booking', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: neither in queue nor in battle', c: -1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.checkBattleNoSearch', null, unicorns[0], callbackFn);
            });
        });
        describe('Case #2', () => {
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

            var playerPids;

            it('Should get players\' pids', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs).to.not.be.a('null');
                    expect(docs.length).to.be.equal(2);

                    playerPids = [docs[0]._id.toString(), docs[1]._id.toString()];

                    done();
                };

                async.parallel([
                    cb => Profile.findOne({ humanId: 1 }, { projection: { _id: 1 } }, cb),
                    cb => Profile.findOne({ humanId: 2 }, { projection: { _id: 1 } }, cb)
                ], callbackFn);
            });

            it('Should call function setSingleRecordForMm', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.setSingleRecordForMm', null, unicorns[0], callbackFn);
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

            it('Should push some values into matchmaking redis', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                async.series([
                    cb => opClients.getMatchmakingClient().getRedis().hmset(
                        'grmb:{\"hosts\":{\"asIP\":\"127.127.127.127\",\"asDomain\":\"hello.world.com\"},\"ports\":{\"wss\":7331,\"ws\":7333}}:39evlr5-23jnt37',
                        'upd', '1551179713309',
                        "opp", playerPids[1],
                        "stat", "0",
                        "pid", playerPids[0],
                        "opbot", "1",
                        "bpd", "-1",
                        cb
                    ),
                    cb => opClients.getMatchmakingClient().getRedis().hmset(
                        `qplr:${playerPids[0]}`,
                        "stat", "4",
                        "grip", "{\"hosts\":{\"asIP\":\"127.127.127.127\",\"asDomain\":\"hello.world.com\"},\"ports\":{\"wss\":7331,\"ws\":7333}}",
                        "upd", "1551179717512",
                        "pid", playerPids[0],
                        "ky", "39evlr5-23jnt37",
                        "opbot", "1",
                        "opp", playerPids[1],
                        cb
                    )
                ], callbackFn);
            });

            it('Should do matchmaking by calling mmWithBot', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.have.property('address');
                    expect(body).to.have.property('key');

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmWithSelf', null, unicorns[0], callbackFn);
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