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
                .requireAsCloudFunction('./cloudFunctions/mmAllInOne.js')
                .requireAsCloudFunction('./cloudFunctions/setTheRecordsForMm.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpAutoCloseHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpDisconnectionHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpCheckGameOver.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpConnectionHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpGameOverHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpGeneratePayload.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpInitGameplayModel.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpTurnHandler.js')
                ._reinitCloudFunctions(done);
        });
    });
    describe('The case', () => {
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
        it('Seconds player should disconnect and first player should see a message about it', done => {
            var disconnected, firstPlayerMessage;

            let callbackFn = () => {
                if(disconnected && firstPlayerMessage){
                    expect(firstPlayerMessage).to.have.property('p', 4);
                    expect(firstPlayerMessage).to.have.property('c', 3);
                    expect(firstPlayerMessage).to.have.property('paused', 1);
                    expect(firstPlayerMessage).to.have.property('turn');
                    expect(firstPlayerMessage.m.theModel).to.have.property('randomSeed');
                    expect(firstPlayerMessage.m.theModel).to.have.property('startTs');
                    delete firstPlayerMessage.m.theModel.randomSeed;
                    delete firstPlayerMessage.m.theModel.startTs;
                    expect(firstPlayerMessage.m).to.deep.equal({
                        isA: 0,
                        playerTurnA: 0, playerTurnB: 0,
                        theModel: {
                            model: {
                                "plrA": {
                                    "some": "payload a"
                                },
                                "plrAsq": 0,
                                "plrB": {
                                    "some": "payload b"
                                },
                                "plrBsq": 0
                            }
                        }
                    });

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

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 1')));
            wsConnection2.on('message', () => done(new Error('WTF 2')));
            wsConnection2.on('close', () => {
                if(!disconnected){
                    disconnected = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 3'))
                }
            });
            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => done(new Error('WTF 4')));
            wsConnection1.on('message', message => {
                if(!firstPlayerMessage){
                    firstPlayerMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 5'))
                }
            });
            wsConnection1.on('close', () => done(new Error('WTF 6')));

            wsConnection2.close();
        });
        it('Second player should connect again and first player should see a message about it', done => {
            var openIsOk, secondPlayerConnectedMessage, firstPlayerMessage;

            let callbackFn = () => {
                if(openIsOk && secondPlayerConnectedMessage && firstPlayerMessage){
                    expect(secondPlayerConnectedMessage).to.have.property('c', 4);
                    expect(secondPlayerConnectedMessage).to.have.property('paused', 0);
                    expect(secondPlayerConnectedMessage).to.have.property('from');
                    delete secondPlayerConnectedMessage.from;
                    expect(secondPlayerConnectedMessage).to.have.property('to');
                    delete secondPlayerConnectedMessage.to;
                    expect(secondPlayerConnectedMessage).to.have.property('state');
                    expect(secondPlayerConnectedMessage.state).to.have.property('isA', 0);
                    expect(secondPlayerConnectedMessage.state).to.have.property('model');
                    expect(secondPlayerConnectedMessage.state.model.mdl).to.have.property('model');
                    expect(secondPlayerConnectedMessage.state.model.mdl.model).to.deep.equal({
                        "plrA": {
                            "some": "payload a"
                        },
                        "plrAsq": 0,
                        "plrB": {
                            "some": "payload b"
                        },
                        "plrBsq": 0
                    });
                    expect(firstPlayerMessage).to.have.property('from');
                    delete firstPlayerMessage.from;
                    expect(firstPlayerMessage).to.have.property('to');
                    delete firstPlayerMessage.to;
                    expect(firstPlayerMessage).to.deep.equal({ p: 4, c: 3, m: { hello: 'I\'m connected' }, paused: 0, turn: 0 });

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
            wsConnection1.on('message', message => {
                if(!firstPlayerMessage){
                    firstPlayerMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'))
                }
            });
            wsConnection1.on('close', () => done(new Error('WTF 3')));

            wsConnection2 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey2}&pv=${_PLATFORM_VERSION}`);

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 4'));
                }
            });
            wsConnection2.on('message', message => {
                if(!secondPlayerConnectedMessage){
                    secondPlayerConnectedMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 5'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 6')));
        });
        it('First player should disconnect and second player should see a message about it', done => {
            var disconnected, secondPlayerMessage;

            let callbackFn = () => {
                if(disconnected && secondPlayerMessage){
                    expect(secondPlayerMessage).to.have.property('p', 4);
                    expect(secondPlayerMessage).to.have.property('c', 3);
                    expect(secondPlayerMessage).to.have.property('paused', 1);
                    expect(secondPlayerMessage).to.have.property('turn');
                    expect(secondPlayerMessage.m.theModel).to.have.property('randomSeed');
                    expect(secondPlayerMessage.m.theModel).to.have.property('startTs');
                    delete secondPlayerMessage.m.theModel.randomSeed;
                    delete secondPlayerMessage.m.theModel.startTs;
                    expect(secondPlayerMessage.m).to.deep.equal({
                        isA: 1,
                        playerTurnA: 0, playerTurnB: 0,
                        theModel: {
                            model: {
                                "plrA": {
                                    "some": "payload a"
                                },
                                "plrAsq": 0,
                                "plrB": {
                                    "some": "payload b"
                                },
                                "plrBsq": 0
                            }
                        }
                    });

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
            wsConnection1.on('close', () => {
                if(!disconnected){
                    disconnected = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 3'))
                }
            });
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 4')));
            wsConnection2.on('message', message => {
                if(!secondPlayerMessage){
                    secondPlayerMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 5'))
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 6')));

            wsConnection1.close();
        });
        it('First player should connect again and second player should see a message about it', done => {
            var openIsOk, firstPlayerConnectedMessage, secondPlayerMessage;

            let callbackFn = () => {
                if(openIsOk && firstPlayerConnectedMessage && secondPlayerMessage){
                    expect(firstPlayerConnectedMessage).to.have.property('c', 4);
                    expect(firstPlayerConnectedMessage).to.have.property('paused', 0);
                    expect(firstPlayerConnectedMessage).to.have.property('from');
                    delete firstPlayerConnectedMessage.from;
                    expect(firstPlayerConnectedMessage).to.have.property('to');
                    delete firstPlayerConnectedMessage.to;
                    expect(firstPlayerConnectedMessage).to.have.property('state');
                    expect(firstPlayerConnectedMessage.state).to.have.property('isA', 1);
                    expect(firstPlayerConnectedMessage.state).to.have.property('model');
                    expect(firstPlayerConnectedMessage.state.model.mdl).to.have.property('model');
                    expect(firstPlayerConnectedMessage.state.model.mdl.model).to.deep.equal({
                        "plrA": {
                            "some": "payload a"
                        },
                        "plrAsq": 0,
                        "plrB": {
                            "some": "payload b"
                        },
                        "plrBsq": 0
                    });
                    expect(secondPlayerMessage).to.have.property('from');
                    delete secondPlayerMessage.from;
                    expect(secondPlayerMessage).to.have.property('to');
                    delete secondPlayerMessage.to;
                    expect(secondPlayerMessage).to.deep.equal({ p: 4, c: 3, m: { hello: 'I\'m connected' }, paused: 0, turn: 0 });

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

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('open', () => done(new Error('WTF 1')));
            wsConnection2.on('message', message => {
                if(!secondPlayerMessage){
                    secondPlayerMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'))
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 3')));

            wsConnection1 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey1}&pv=${_PLATFORM_VERSION}`);

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 4'));
                }
            });
            wsConnection1.on('message', message => {
                if(!firstPlayerConnectedMessage){
                    firstPlayerConnectedMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 5'));
                }
            });
            wsConnection1.on('close', () => done(new Error('WTF 6')));
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