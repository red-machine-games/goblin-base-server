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
describe('The cases', () => {
    const _PLATFORM_VERSION = 'ios;0.0.2';

    var cachedMatchmakingStrategy;

    describe('Stuff', () => {
        it('Should do some stuff', () => {
            cachedMatchmakingStrategy = goblinBase.matchmakingConfig.strategy;
            goblinBase.matchmakingConfig.strategy = 'open';
        });
        it('Should add cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpAutoCloseHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpCheckGameOver.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpConnectionHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpGameOverHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpGeneratePayload.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpInitGameplayModel.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpTurnHandler.js')
                .requireAsCloudFunction('./cloudFunctions/mmAcceptPvpMatch.js')
                .requireAsCloudFunction('./cloudFunctions/mmAllInOne.js')
                .requireAsCloudFunction('./cloudFunctions/mmCheckPveNoSearch.js')
                .requireAsCloudFunction('./cloudFunctions/mmDeclinePvpMatch.js')
                .requireAsCloudFunction('./cloudFunctions/mmSearchPvpOpponent.js')
                .requireAsCloudFunction('./cloudFunctions/mmSearchPvpOpponentByLadder.js')
                .requireAsCloudFunction('./cloudFunctions/mmStopSearchingForAnyPvpOpponent.js')
                .requireAsCloudFunction('./cloudFunctions/mmWaitForPvpOpponentToAccept.js')
                .requireAsCloudFunction('./cloudFunctions/readProfileData.js')
                .requireAsCloudFunction('./cloudFunctions/setTheRecordsForMm.js')
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

        var wsConnection1, wsConnection2;

        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('open');
                wsConnection1.removeAllListeners('close');

                done();
            };

            wsConnection1 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey1}&pv=${_PLATFORM_VERSION}`);

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', callbackFn);
            wsConnection1.on('close', () => done(new Error('WTF 1')));
        });
        it('Second player should connect ws with gameroom', done => {
            let callbackFn = () => {
                wsConnection2.removeAllListeners('error');
                wsConnection2.removeAllListeners('open');
                wsConnection2.removeAllListeners('close');

                done();
            };

            wsConnection2 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey2}&pv=${_PLATFORM_VERSION}`);

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', callbackFn);
            wsConnection2.on('close', () => done(new Error('WTF 1')));
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
        it('Both player should set ready and receive p-4,c-3 messages', done => {
            var setReadyResponseOkay = false,
                wsMessage;

            let generalCallbackFn = () => {
                if(setReadyResponseOkay && wsMessage){
                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('open');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');

                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('close');

                    expect(wsMessage).to.have.property('p', 4);
                    expect(wsMessage).to.have.property('c', 3);
                    expect(wsMessage).to.have.property('m', 'GR: gameplay model established');
                    expect(wsMessage).to.have.property('oppPayload');
                    expect(wsMessage.oppPayload).to.deep.equal({ some: 'payload b' });
                    expect(wsMessage).to.have.property('startTs');
                    expect(wsMessage).to.have.property('randomSeed');
                    expect(wsMessage.startTs).to.be.above(0);
                    expect(wsMessage.randomSeed).to.be.above(0);

                    done();
                }
            };

            let wsMessageCallbackFn = message => {
                if(wsMessage){
                    done(new Error('WTF 6'))
                } else if(message.p === 4 && message.c === 3){
                    wsMessage = message;
                    generalCallbackFn();
                }
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 1')));
            wsConnection1.on('message', message => {
                if(!wsMessage){
                    wsMessageCallbackFn(JSON.parse(message));
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection1.on('close', () => done(new Error('WTF 3')));

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 4')));
            wsConnection2.on('close', () => done(new Error('WTF 5')));

            let setReadyCallback = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload b' } });
                expect(body2).to.have.property('p', 4);
                expect(body2).to.have.property('c', 3);
                expect(body2).to.have.property('m', 'GR: gameplay model established');
                expect(body2).to.have.property('oppPayload');
                expect(body2.oppPayload).to.deep.equal({ some: 'payload a' });
                expect(body2).to.have.property('startTs');
                expect(body2).to.have.property('randomSeed');
                expect(body2.startTs).to.be.above(0);
                expect(body2.randomSeed).to.be.above(0);

                setReadyResponseOkay = true;
                generalCallbackFn();
            };

            async.parallel([
                cb => testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey1, cb),
                cb => testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, cb)
            ], setReadyCallback);
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
        it('Should wait 1 sec', done => setTimeout(done, 1000));

        var wsConnection1, wsConnection2;

        it('Both players should receive c-4 messages', done => {
            var wsMessage1, wsMessage2;

            let generalCallbackFn = () => {
                if(wsMessage1 && wsMessage2){
                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');

                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    expect(wsMessage1).to.have.property('c', 4);
                    expect(wsMessage1).to.have.property('state');
                    expect(wsMessage1.state).to.have.property('isA', 1);
                    expect(wsMessage1.state).to.have.property('model');

                    expect(wsMessage2).to.have.property('c', 4);
                    expect(wsMessage2).to.have.property('state');
                    expect(wsMessage2.state).to.have.property('isA', 0);
                    expect(wsMessage2.state).to.have.property('model');

                    expect(wsMessage1.state.model.mdl).to.deep.equal(wsMessage2.state.model.mdl);

                    done();
                }
            };

            let wsMessageCallbackFn = (firstOrSecond, message) => {
                if(firstOrSecond === 1){
                    if(wsMessage1){
                        done(new Error('WTF 6'))
                    } else if(message.c === 4){
                        wsMessage1 = message;
                        generalCallbackFn();
                    }
                } else if(firstOrSecond === 2){
                    if(wsMessage2){
                        done(new Error('WTF 7'))
                    } else if(message.c === 4){
                        wsMessage2 = message;
                        generalCallbackFn();
                    }
                } else {
                    done(new Error('WTF 8'))
                }
            };

            wsConnection1 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey1}&pv=${_PLATFORM_VERSION}`);

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('message', message => {
                if(!wsMessage1){
                    wsMessageCallbackFn(1, JSON.parse(message));
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection1.on('close', () => done(new Error('WTF 3')));

            wsConnection2 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey2}&pv=${_PLATFORM_VERSION}`);

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('message', message => {
                if(!wsMessage2){
                    wsMessageCallbackFn(2, JSON.parse(message));
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 5')));
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