'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    WebSocket = require('ws');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('../utils/testUtils.js');

const START_AT_HOST = require('../testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../testEntryPoint.js').START_AT_PORT;

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
                .requireAsCloudFunction('./cloudFunctions/createNewProfile.js')
                .requireAsCloudFunction('./cloudFunctions/mmWithNonexistent.js')
                .requireAsCloudFunction('./cloudFunctions/mmWithNull.js')
                .requireAsCloudFunction('./cloudFunctions/mmWithRealPlayer.js')
                .requireAsCloudFunction('./cloudFunctions/mmWithSelf.js')
                .requireAsCloudFunction('./cloudFunctions/readProfileData.js')
                .requireAsCloudFunction('./cloudFunctions/setSingleRecordForMm.js')
                .requireAsCloudFunction('./cloudFunctions/setTheRecordsForMm.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpAutoCloseHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpCheckGameOver.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpConnectionHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpGameOverHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpGeneratePayload.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpInitGameplayModel.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpTurnHandler.js')
                ._reinitCloudFunctions(done);
        });
    });
    describe('Case #1', () => {
        var unicorns = [], gClientIds = [], gClientSecrets = [];

        it(`Should create new account`, done => {
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
        it(`Should create new profile`, done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[0], callbackFn);
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

        var gameroomHost, gameroomPort,
            bookingKey1;

        it('Should do matchmaking by calling mmWithSelf', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                gameroomHost = body.address.hosts.asDomain;
                gameroomPort = body.address.ports.ws;
                bookingKey1 = body.key;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmWithSelf', null, unicorns[0], callbackFn);
        });
        it('First player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 1, m: 'GR: pair formed' });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
        });
        it('First player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: set ready' });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload a' }, bookingKey1, callbackFn);
        });
        it('First player should set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('randomSeed');
                expect(body).to.have.property('startTs');
                expect(body).to.have.property('isA');
                delete body.randomSeed;
                delete body.startTs;
                delete body.isA;
                expect(body).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { some: 'bot payload space 1' } });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey1, callbackFn);
        });

        var wsConnection1;

        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if(openIsOk && messageIsOkay){
                    expect(theMessage).to.have.property('c', 4);
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('isA', 1);
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state.model.mdl).to.have.property('model');
                    expect(theMessage.state.model.mdl.model).to.deep.equal({
                        "plrA": {
                            "some": "payload a"
                        },
                        "plrB": {
                            "some": "bot payload space 1"
                        },
                        "plrAsq": 0,
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
        it(`Should wait and get an auto close messages`, done => {
            var code1, message1;

            let generalCallbackFn = () => {
                if(code1 && message1 != null){
                    expect(code1).to.be.equal(1006);
                    expect(message1).to.be.equal('');

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('close');

                    done();
                }
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('close', (code, message) => {
                code1 = code;
                message1 = message;
                generalCallbackFn();
            });
        });
        it('Should wait ~10 sec', done => setTimeout(done, goblinBase.pvpConfig.numericConstants.pairInGameTtlMs));
        it('First player should list pvp battles', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('now');
                expect(body.l.length).to.be.equal(1);
                expect(body.l[0]).to.have.property('hida', 1);
                expect(body.l[0]).to.not.have.property('hidb');
                expect(body.l[0]).to.have.property('cat');
                expect(body.l[0]).to.have.property('dsp');
                expect(body.l[0]).to.have.property('auto', true);
                expect(body.l[0].dsp).to.have.property('looo', 'sers');
                expect(body.l[0].dsp).to.have.property('lagA');
                expect(body.l[0].dsp).to.have.property('lagB', 0);

                expect(body.l[0].dsp.lagA).to.be.a('number');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorns[0], callbackFn);
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

        it(`Should create new account`, done => {
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
        it(`Should create new profile`, done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[0], callbackFn);
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

        var gameroomHost, gameroomPort,
            bookingKey1;

        it('Should do matchmaking by calling mmWithNull', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                gameroomHost = body.address.hosts.asDomain;
                gameroomPort = body.address.ports.ws;
                bookingKey1 = body.key;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmWithNull', null, unicorns[0], callbackFn);
        });
        it('First player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 1, m: 'GR: pair formed' });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
        });
        it('First player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: set ready' });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload a' }, bookingKey1, callbackFn);
        });
        it('First player should set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('randomSeed');
                expect(body).to.have.property('startTs');
                expect(body).to.have.property('isA');
                delete body.randomSeed;
                delete body.startTs;
                delete body.isA;
                expect(body).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { some: 'bot payload space 1' } });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey1, callbackFn);
        });

        var wsConnection1;

        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if(openIsOk && messageIsOkay){
                    expect(theMessage).to.have.property('c', 4);
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('isA', 1);
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state.model.mdl).to.have.property('model');
                    expect(theMessage.state.model.mdl.model).to.deep.equal({
                        "plrA": {
                            "some": "payload a"
                        },
                        "plrB": {
                            "some": "bot payload space 1"
                        },
                        "plrAsq": 0,
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
        it(`Should wait and get an auto close messages`, done => {
            var code1, message1;

            let generalCallbackFn = () => {
                if(code1 && message1 != null){
                    expect(code1).to.be.equal(1006);
                    expect(message1).to.be.equal('');

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('close');

                    done();
                }
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('close', (code, message) => {
                code1 = code;
                message1 = message;
                generalCallbackFn();
            });
        });
        it('Should wait ~10 sec', done => setTimeout(done, goblinBase.pvpConfig.numericConstants.pairInGameTtlMs));
        it('First player should list pvp battles', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('now');
                expect(body.l.length).to.be.equal(1);
                expect(body.l[0]).to.have.property('hida', 1);
                expect(body.l[0]).to.not.have.property('hidb');
                expect(body.l[0]).to.have.property('cat');
                expect(body.l[0]).to.have.property('dsp');
                expect(body.l[0]).to.have.property('auto', true);
                expect(body.l[0].dsp).to.have.property('looo', 'sers');
                expect(body.l[0].dsp).to.have.property('lagA');
                expect(body.l[0].dsp).to.have.property('lagB', 0);

                expect(body.l[0].dsp.lagA).to.be.a('number');

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorns[0], callbackFn);
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
            bookingKey1;

        it('Should do matchmaking by calling mmWithRealPlayer', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                gameroomHost = body.address.hosts.asDomain;
                gameroomPort = body.address.ports.ws;
                bookingKey1 = body.key;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmWithRealPlayer', null, unicorns[0], callbackFn);
        });
        it('First player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 1, m: 'GR: pair formed' });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
        });
        it('First player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: set ready' });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload a' }, bookingKey1, callbackFn);
        });
        it('First player should set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('randomSeed');
                expect(body).to.have.property('startTs');
                expect(body).to.have.property('isA');
                delete body.randomSeed;
                delete body.startTs;
                delete body.isA;
                expect(body).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { some: 'bot payload space 2' } });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey1, callbackFn);
        });

        var wsConnection1;

        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if(openIsOk && messageIsOkay){
                    expect(theMessage).to.have.property('c', 4);
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('isA', 1);
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state.model.mdl).to.have.property('model');
                    expect(theMessage.state.model.mdl.model).to.deep.equal({
                        "plrA": {
                            "some": "payload a"
                        },
                        "plrB": {
                            "some": "bot payload space 2"
                        },
                        "plrAsq": 0,
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
        it(`Should wait and get an auto close messages`, done => {
            var code1, message1;

            let generalCallbackFn = () => {
                if(code1 && message1 != null){
                    expect(code1).to.be.equal(1006);
                    expect(message1).to.be.equal('');

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('close');

                    done();
                }
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('close', (code, message) => {
                code1 = code;
                message1 = message;
                generalCallbackFn();
            });
        });
        it('Should wait ~10 sec', done => setTimeout(done, goblinBase.pvpConfig.numericConstants.pairInGameTtlMs));

        var cachedBattleJournal;

        it('First player should list pvp battles', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('now');
                expect(body.l.length).to.be.equal(1);
                expect(body.l[0]).to.have.property('hida', 1);
                expect(body.l[0]).to.have.property('hidb', 2);
                expect(body.l[0]).to.have.property('cat');
                expect(body.l[0]).to.have.property('dsp');
                expect(body.l[0]).to.have.property('auto', true);
                expect(body.l[0].dsp).to.have.property('looo', 'sers');
                expect(body.l[0].dsp).to.have.property('lagA');
                expect(body.l[0].dsp).to.have.property('lagB', 0);

                expect(body.l[0].dsp.lagA).to.be.a('number');

                delete body.now;
                cachedBattleJournal = body;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorns[0], callbackFn);
        });
        it('Second player should list pvp battles', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                delete body.now;
                expect(body).to.deep.equal(cachedBattleJournal);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorns[1], callbackFn);
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

        it(`Should create new account`, done => {
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
        it(`Should create new profile`, done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[0], callbackFn);
        });

        it('Should call function setSingleRecordForMm', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.setSingleRecordForMm', null, unicorns[0], callbackFn);
        });
        it('Should try to do matchmaking by calling mmWithNonexistent', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(500);

                expect(body).to.deep.equal(new ErrorResponse(806, 'Didn\'t found hand selected opponent', { cfName: 'mmWithNonexistent' }));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmWithNonexistent', null, unicorns[0], callbackFn);
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