'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    WebSocket = require('ws'),
    crypto = require('crypto');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

var BattleModel = require('../lib/persistenceSubsystem/dao/battle.js');

var ErrorResponse = require('../lib/objects/ErrorResponse.js');

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
    const _PLATFORM_VERSION = 'ios;0.0.2';

    var cachedPairsCapacity;

    var gClientId1, gClientSecret1;

    var unicorn1, unicorn2;

    describe('Stuff', () => {
        it('Should change pairs capacity', () => {
            cachedPairsCapacity = goblinBase.pvpConfig.pairsCapacity;
            goblinBase.pvpConfig.pairsCapacity = 2;
        });

        var roomOccupation;

        it('Should get room occupation by hand ¯\\_(ツ)_/¯', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');

                roomOccupation = +response;

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

        it('Should add account 1', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                gClientId1 = body.gClientId;
                gClientSecret1 = body.gClientSecret;
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
    });
    describe('Case #1', () => {
        var gameroomHost, gameroomPort,
            bookingKey1, bookingKey2;

        it('Both players should find each other', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({stat: 'MM: accept or decline the game', c: 1});

                done();
            };

            async.parallel([
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
            ], callbackFn);
        });
        it('First player should accept match', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({stat: 'MM: waiting for opponent to accept the game', c: 2});

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
        });
        it('Second player should accept match', done => {
            var firstIsOkay = false, secondIsOkay = false,
                keyOne;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                gameroomHost = body.address.hosts.asDomain;
                gameroomPort = body.address.ports.ws;
                bookingKey1 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                firstIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                bookingKey2 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                secondIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
        });
        it('First player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 0, m: 'GR: pair allocated. Wait for opponent'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
        });
        it('Second player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: pair formed'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
        });
        it('Both players should try to surrender', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(400);
                expect(responses[1][0].statusCode).to.be.equal(400);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal(new ErrorResponse(584, 'Pair not found or cannot surrender'));

                done();
            };

            async.parallel([
                cb => testUtils.pvp.thePost(gameroomHost, gameroomPort, 'surrender', null, null, bookingKey1, cb),
                cb => testUtils.pvp.thePost(gameroomHost, gameroomPort, 'surrender', null, null, bookingKey2, cb)
            ], callbackFn);
        });
        it('First player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: payload set'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, callbackFn);
        });
        it('Second player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 2, m: 'GR: set ready'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, callbackFn);
        });
        it('First player should set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload' }});

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
                expect(body).to.deep.equal({
                    p: 4, c: 3,
                    m: 'GR: gameplay model established',
                    oppPayload: { some: 'payload' }
                });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
        });

        var wsConnection1, wsConnection2;

        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 1,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection1.on('message', message => {
                if (!messageIsOkay) {
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
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 0,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection2.on('message', message => {
                if (!messageIsOkay) {
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 3')));
        });
        it('First player should surrender', done => {
            var surrenderIsOkay, messageIsOkay, theMessage;

            let generalCallbackFn = () => {
                if (surrenderIsOkay && messageIsOkay) {
                    expect(theMessage).to.deep.equal({ c: -1, m: 'GR: auto gameover', dsp: { hidA: 1, hidB: 2, lagA: Number.MAX_VALUE, lagB: 0 }});

                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                }
            };

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('message', () => done(new Error('WTF 3')));
            wsConnection2.on('close', (code, reason) => {
                expect(code).to.be.equal(4200);
                if (!messageIsOkay) {
                    messageIsOkay = true;
                    theMessage = JSON.parse(reason);
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });

            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');

                expect(response.statusCode).to.be.equal(200);

                surrenderIsOkay = true;
                generalCallbackFn();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'surrender', null, null, bookingKey1, callbackFn);
        });
        it.skip('Both players should get battles listing', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');

                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                delete body1.now;
                delete body2.now;

                expect(body1).to.deep.equal(body2);
                expect(body2.l.length).to.be.equal(1);
                expect(body2.l[0].auto).to.be.equal(true);
                expect(body2.l[0].hida).to.be.equal(1);
                expect(body2.l[0].hidb).to.be.equal(2);
                expect(body2.l[0].id).to.be.equal(1);
                expect(body2.l[0]).to.have.property('cat');
                expect(body2.l[0].dsp.hello).to.be.equal('world');
                expect(body2.l[0].dsp).to.have.property('lagA');
                expect(body2.l[0].dsp).to.have.property('lagB');
                expect(body2.l[0].dsp.theModelIsNull).to.be.equal(false);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn1, cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn2, cb)
            ], callbackFn);
        });
        it('Should erase battles', done => {
            let callbackFn = err => {
                expect(err).to.be.a('null');

                done();
            };

            BattleModel.deleteMany({}, callbackFn);
        });
    });
    describe('Case #2', () => {
        var gameroomHost, gameroomPort,
            bookingKey1, bookingKey2;

        it('Both players should find each other', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({stat: 'MM: accept or decline the game', c: 1});

                done();
            };

            async.parallel([
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
            ], callbackFn);
        });
        it('First player should accept match', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({stat: 'MM: waiting for opponent to accept the game', c: 2});

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
        });
        it('Second player should accept match', done => {
            var firstIsOkay = false, secondIsOkay = false,
                keyOne;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                gameroomHost = body.address.hosts.asDomain;
                gameroomPort = body.address.ports.ws;
                bookingKey1 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                firstIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                bookingKey2 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                secondIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
        });
        it('First player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 0, m: 'GR: pair allocated. Wait for opponent'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
        });
        it('Second player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: pair formed'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
        });
        it('First player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: payload set'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, callbackFn);
        });
        it('Second player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 2, m: 'GR: set ready'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, callbackFn);
        });
        it('First player should set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload' }});

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
                expect(body).to.deep.equal({
                    p: 4, c: 3,
                    m: 'GR: gameplay model established',
                    oppPayload: { some: 'payload' }
                });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
        });

        var wsConnection1, wsConnection2;

        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 1,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection1.on('message', message => {
                if (!messageIsOkay) {
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
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 0,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection2.on('message', message => {
                if (!messageIsOkay) {
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 3')));
        });
        it('Should wait a while', done => setTimeout(done, 500));
        it('Second player should surrender', done => {
            var surrenderIsOkay, messageIsOkay, theMessage;

            let generalCallbackFn = () => {
                if (surrenderIsOkay && messageIsOkay) {
                    expect(theMessage).to.deep.equal({ c: -1, m: 'GR: auto gameover', dsp: { hidA: 1, hidB: 2, lagA: 0, lagB: Number.MAX_VALUE }});

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');

                    done();
                }
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('message', (w, t, f) => done(new Error('WTF 3')));
            wsConnection1.on('close', (code, reason) => {
                if (!messageIsOkay) {
                    messageIsOkay = true;
                    theMessage = JSON.parse(reason);
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });

            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');

                expect(response.statusCode).to.be.equal(200);

                surrenderIsOkay = true;
                generalCallbackFn();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'surrender', null, null, bookingKey2, callbackFn);
        });
        it.skip('Both players should get battles listing', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');

                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                delete body1.now;
                delete body2.now;

                expect(body1).to.deep.equal(body2);
                expect(body2.l.length).to.be.equal(1);
                expect(body2.l[0].auto).to.be.equal(true);
                expect(body2.l[0].hida).to.be.equal(1);
                expect(body2.l[0].hidb).to.be.equal(2);
                expect(body2.l[0].id).to.be.equal(2);
                expect(body2.l[0]).to.have.property('cat');
                expect(body2.l[0].dsp.hello).to.be.equal('world');
                expect(body2.l[0].dsp).to.have.property('lagA');
                expect(body2.l[0].dsp).to.have.property('lagB');
                expect(body2.l[0].dsp.theModelIsNull).to.be.equal(false);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn1, cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn2, cb)
            ], callbackFn);
        });
        it('Should erase battles', done => {
            let callbackFn = err => {
                expect(err).to.be.a('null');

                done();
            };

            BattleModel.deleteMany({}, callbackFn);
        });
    });
    describe('Case #3', () => {
        var gameroomHost, gameroomPort,
            bookingKey1, bookingKey2;

        it('Both players should find each other', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({stat: 'MM: accept or decline the game', c: 1});

                done();
            };

            async.parallel([
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
            ], callbackFn);
        });
        it('First player should accept match', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({stat: 'MM: waiting for opponent to accept the game', c: 2});

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
        });
        it('Second player should accept match', done => {
            var firstIsOkay = false, secondIsOkay = false,
                keyOne;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                gameroomHost = body.address.hosts.asDomain;
                gameroomPort = body.address.ports.ws;
                bookingKey1 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                firstIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                bookingKey2 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                secondIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
        });
        it('First player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 0, m: 'GR: pair allocated. Wait for opponent'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
        });
        it('Second player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: pair formed'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
        });
        it('First player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: payload set'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, callbackFn);
        });
        it('Second player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 2, m: 'GR: set ready'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, callbackFn);
        });
        it('First player should set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload' }});

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
                expect(body).to.deep.equal({
                    p: 4, c: 3,
                    m: 'GR: gameplay model established',
                    oppPayload: { some: 'payload' }
                });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
        });

        var wsConnection1, wsConnection2;

        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 1,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection1.on('message', message => {
                if (!messageIsOkay) {
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
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 0,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection2.on('message', message => {
                if (!messageIsOkay) {
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 3')));
        });

        var pingInterval;

        it('First player should send ping every second', () => {
            pingInterval = setInterval(() => {
                wsConnection1.send(JSON.stringify({ ping: 10 }));
            }, 1000);
        });

        var timeCached;

        it(`Socket of second player should auto close after ~2000 ms and first player should get "opponent disconnected"`, done => {
            var now = _.now(),
                closeIsOkay = false, messageIsOkay = false;

            let callbackFn_Close = () => {
                var theNow = _.now();
                timeCached = theNow - now;
                expect(timeCached).to.be.above(goblinBase.pvpConfig.numericConstants.socketTtlMs - goblinBase.pvpConfig.numericConstants.checkSocketsEveryMs - 700);
                expect(timeCached).to.be.below(goblinBase.pvpConfig.numericConstants.socketTtlMs + goblinBase.pvpConfig.numericConstants.checkSocketsEveryMs + 700);

                closeIsOkay = true;
                callbackFn();
            };
            let callbackFn_Message = message => {
                message = JSON.parse(message);
                if (_.keys(message).length === 6) {
                    let theNow = _.now();
                    expect(theNow - now).to.be.above(goblinBase.pvpConfig.numericConstants.unpausedGameTtlMs + 1000 - timeCached - 5000);
                    expect(theNow - now).to.be.below(goblinBase.pvpConfig.numericConstants.unpausedGameTtlMs + 1000 - timeCached + 5000);
                    expect(message).to.have.property('from');
                    delete message.from;
                    expect(message).to.deep.equal({ p: 4, c: 3, m: 'GR: opponent disconnected', paused: 1, turn: 0 });

                    messageIsOkay = true;
                    callbackFn();
                }
            };

            let callbackFn = () => {
                if(closeIsOkay && messageIsOkay){
                    wsConnection1.removeAllListeners('close');
                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');
                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('message');

                    done();
                }
            };

            wsConnection2.on('close', callbackFn_Close);
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('message', () => done(new Error('WTF 1')));
            wsConnection1.on('message', callbackFn_Message);
            wsConnection1.on('close', () => done(new Error('WTF 2')));
            wsConnection1.on('error', err => done(err));
        });
        it(`Second player should connect after ~3500 and first player should get "opponent connected"`, done => {
            setTimeout(() => {
                var firstMessageIsOkay, firstPlayerMessage, openIsOk, secondMessageIsOkay, secondPlayerMessage;

                let callbackFn = () => {
                    if (firstPlayerMessage && openIsOk && secondPlayerMessage) {
                        expect(secondPlayerMessage).to.have.property('state');
                        expect(secondPlayerMessage.state).to.have.property('model');
                        expect(secondPlayerMessage.state).to.have.property('randomSeed');
                        expect(secondPlayerMessage.state).to.have.property('startTs');
                        expect(secondPlayerMessage.state).to.have.property('opponentPayload');
                        delete secondPlayerMessage.state.opponentPayload;
                        delete secondPlayerMessage.state.randomSeed;
                        delete secondPlayerMessage.state.startTs;
                        expect(secondPlayerMessage).to.have.property('from', firstPlayerMessage.from);
                        delete secondPlayerMessage.from;
                        expect(secondPlayerMessage).to.have.property('to', firstPlayerMessage.to);
                        delete secondPlayerMessage.to;
                        expect(secondPlayerMessage).to.have.property('paused', 0);
                        delete secondPlayerMessage.paused;
                        expect(secondPlayerMessage).to.deep.equal({
                            "c": 4,
                            "state": {
                                "playerTurnA": 0,
                                "playerTurnB": 0,
                                "isA": 0,
                                "model": {
                                    "plrA": {
                                        "some": "payload"
                                    },
                                    "plrB": {
                                        "some": "payload"
                                    },
                                    "plrAsq": 0,
                                    "plrBsq": 0
                                }
                            }
                        });

                        delete firstPlayerMessage.from;
                        delete firstPlayerMessage.to;
                        expect(firstPlayerMessage).to.deep.equal({ p: 4, c: 3, m: 'GR: opponent connected', isA: 1, paused: 0, turn: 0 });

                        wsConnection1.removeAllListeners('close');
                        wsConnection1.removeAllListeners('error');
                        wsConnection1.removeAllListeners('message');
                        wsConnection2.removeAllListeners('close');
                        wsConnection2.removeAllListeners('open');
                        wsConnection2.removeAllListeners('error');
                        wsConnection2.removeAllListeners('message');

                        done();
                    }
                };

                wsConnection1.on('message', message => {
                    if (!firstMessageIsOkay) {
                        firstMessageIsOkay = true;
                        firstPlayerMessage = JSON.parse(message);
                        callbackFn();
                    } else {
                        done(new Error('WTF 1'));
                    }
                });
                wsConnection1.on('close', () => done(new Error('WTF 2')));
                wsConnection1.on('error', err => done(err));

                wsConnection2 = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey2}&pv=${_PLATFORM_VERSION}`);

                wsConnection2.on('error', err => done(err));
                wsConnection2.on('open', () => {
                    if (!openIsOk) {
                        openIsOk = true;
                        callbackFn();
                    } else {
                        done(new Error('WTF 3'));
                    }
                });
                wsConnection2.on('message', message => {
                    if (!secondMessageIsOkay) {
                        secondMessageIsOkay = true;
                        secondPlayerMessage = JSON.parse(message);
                        callbackFn();
                    } else {
                        done(new Error('WTF 4'));
                    }
                });
                wsConnection2.on('close', () => done(new Error('WTF 5')));
            }, goblinBase.pvpConfig.numericConstants.pausedPairTtlMs / 2);
        });
        it(`Socket of second player should auto close after ~2000 ms and first player should get "opponent disconnected"`, done => {
            var now = _.now(),
                closeIsOkay = false, messageIsOkay = false;

            let callbackFn_Close = () => {
                var theNow = _.now();
                timeCached = theNow - now;
                expect(timeCached).to.be.above(goblinBase.pvpConfig.numericConstants.socketTtlMs - goblinBase.pvpConfig.numericConstants.checkSocketsEveryMs - 700);
                expect(timeCached).to.be.below(goblinBase.pvpConfig.numericConstants.socketTtlMs + goblinBase.pvpConfig.numericConstants.checkSocketsEveryMs + 700);

                closeIsOkay = true;
                callbackFn();
            };
            let callbackFn_Message = message => {
                message = JSON.parse(message);
                if (_.keys(message).length === 6) {
                    let theNow = _.now();
                    expect(theNow - now).to.be.above(goblinBase.pvpConfig.numericConstants.unpausedGameTtlMs + 1000 - timeCached - 5000);
                    expect(theNow - now).to.be.below(goblinBase.pvpConfig.numericConstants.unpausedGameTtlMs + 1000 - timeCached + 5000);
                    expect(message).to.have.property('from');
                    delete message.from;
                    expect(message).to.deep.equal({ p: 4, c: 3, m: 'GR: opponent disconnected', paused: 1, turn: 0 });

                    messageIsOkay = true;
                    callbackFn();
                }
            };

            let callbackFn = () => {
                if(closeIsOkay && messageIsOkay){
                    wsConnection1.removeAllListeners('close');
                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');
                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('message');

                    done();
                }
            };

            wsConnection2.on('close', callbackFn_Close);
            wsConnection2.on('error', err => done(err));
            wsConnection2.on('message', () => done(new Error('WTF 1')));
            wsConnection1.on('message', callbackFn_Message);
            wsConnection1.on('close', () => done(new Error('WTF 2')));
            wsConnection1.on('error', err => done(err));
        });
        it(`First player should get "auto gameover" and closed ws after ~7000 ms`, done => {
            var now = _.now();

            setTimeout(() => clearInterval(pingInterval), goblinBase.pvpConfig.numericConstants.pausedPairTtlMs);

            let callbackFn = (code, reason) => {
                var _okay = true;
                try{
                    expect(code).to.be.equal(4200);
                } catch(__){
                    expect(code).to.be.equal(1006);
                    _okay = false;
                }
                if(_okay){
                    var theNow = _.now();
                    expect(theNow - now).to.be.above(goblinBase.pvpConfig.numericConstants.pausedPairTtlMs - goblinBase.pvpConfig.numericConstants.pausedTimedoutPairInactivityMs - 50);
                    expect(theNow - now).to.be.below(goblinBase.pvpConfig.numericConstants.pausedPairTtlMs + goblinBase.pvpConfig.numericConstants.pausedTimedoutPairInactivityMs + 50);

                    reason = JSON.parse(reason);
                    expect(reason).to.have.property('dsp');
                    expect(reason.dsp).to.have.property('hidA', 1);
                    expect(reason.dsp).to.have.property('hidB', 2);
                    expect(reason.dsp).to.have.property('lagA');
                    expect(reason.dsp).to.have.property('lagB');
                    delete reason.dsp;
                    expect(reason).to.deep.equal({ c: -1, m: 'GR: auto gameover' });
                }

                wsConnection1.removeAllListeners('close');
                wsConnection1.removeAllListeners('error');
                wsConnection1.removeAllListeners('message');

                done();
            };

            wsConnection1.on('close', callbackFn);
            wsConnection1.on('error', err => done(err));
            wsConnection1.on('message', msg => {
                if (msg !== '{"yrAvg":10,"oppAvg":0}') {
                    done(new Error('WTF 1'))
                }
            });
        });
        it('Both players should /checkBattleNoSearch', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');

                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({ stat: 'MM: neither in queue nor in battle', c: -1 });

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.checkBattleNoSearch', null, unicorn1, cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.checkBattleNoSearch', null, unicorn2, cb)
            ], callbackFn);
        });
        it.skip('Both players should get battles listing', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');

                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                delete body1.now;
                delete body2.now;

                expect(body1).to.deep.equal(body2);
                expect(body2.l.length).to.be.equal(1);
                expect(body2.l[0].auto).to.be.equal(true);
                expect(body2.l[0].hida).to.be.equal(1);
                expect(body2.l[0].hidb).to.be.equal(2);
                expect(body2.l[0].id).to.be.equal(3);
                expect(body2.l[0]).to.have.property('cat');
                expect(body2.l[0].dsp.hello).to.be.equal('world');
                expect(body2.l[0].dsp).to.have.property('lagA');
                expect(body2.l[0].dsp).to.have.property('lagB');
                expect(body2.l[0].dsp.theModelIsNull).to.be.equal(false);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn1, cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn2, cb)
            ], callbackFn);
        });
    });
    describe('Case #4', () => {
        const N = 14;

        var gameroomHost, gameroomPort,
            bookingKey1, bookingKey2;

        it('Both players should find each other', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({stat: 'MM: accept or decline the game', c: 1});

                done();
            };

            async.parallel([
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
            ], callbackFn);
        });
        it('First player should accept match', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({stat: 'MM: waiting for opponent to accept the game', c: 2});

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
        });
        it('Second player should accept match', done => {
            var firstIsOkay = false, secondIsOkay = false,
                keyOne;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                gameroomHost = body.address.hosts.asDomain;
                gameroomPort = body.address.ports.ws;
                bookingKey1 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                firstIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                bookingKey2 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                secondIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
        });
        it('First player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 0, m: 'GR: pair allocated. Wait for opponent'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
        });
        it('Second player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: pair formed'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
        });
        it('First player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: payload set'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, callbackFn);
        });
        it('Second player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 2, m: 'GR: set ready'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, callbackFn);
        });
        it('First player should set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload' }});

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
                expect(body).to.deep.equal({
                    p: 4, c: 3,
                    m: 'GR: gameplay model established',
                    oppPayload: { some: 'payload' }
                });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
        });

        var wsConnection1, wsConnection2;

        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 1,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection1.on('message', message => {
                if (!messageIsOkay) {
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
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 0,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection2.on('message', message => {
                if (!messageIsOkay) {
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 3')));
        });

        _(N).times(n => {
            it(`First player should send battle message #${n + 1} and second should receive it`, done => {
                let callbackFn = msg => {
                    expect(JSON.parse(msg)).to.deep.equal({ oppsq: n + 1, m: { hello: 'world' }});

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

                let message = { mysq: n + 1, m: { hello: 'world' }},
                    sign = `/${JSON.stringify(message)}${bookingKey1}default`;
                message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
                wsConnection1.send(JSON.stringify(message));
            });
        });
        _(N).times(n => {
            it(`Second player should send battle message #${n + 1} and first should receive it`, done => {
                let callbackFn = msg => {
                    expect(JSON.parse(msg)).to.deep.equal({ oppsq: n + 1, m: { calm: 'wire' }});

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

                let message = { mysq: n + 1, m: { calm: 'wire' }},
                    sign = `/${JSON.stringify(message)}${bookingKey2}default`;
                message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
                wsConnection2.send(JSON.stringify(message));
            });
        });
        it('Second player should finish battle', done => {
            var firstCloseIsOkay = false, secondCloseIsOkay = false,
                firstCode, firstMessage, secondCode, secondMessage;

            let generalCallbackFn = () => {
                if (firstCloseIsOkay && secondCloseIsOkay) {
                    expect(firstCode).to.be.equal(secondCode);
                    expect(secondCode).to.be.equal(4200);
                    expect(firstMessage).to.deep.equal(secondMessage);
                    expect(secondMessage).to.deep.equal({
                        gameIsOver: true,
                        finalm: { m: { hello: 'world3' }, asq: 14, bsq: 15 }
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
            wsConnection1.on('close', (code, reason) => {
                if (!firstCloseIsOkay) {
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
                if (!secondCloseIsOkay) {
                    secondCloseIsOkay = true;
                    secondCode = code;
                    secondMessage = JSON.parse(reason);
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 6'))
                }
            });

            let message = { mysq: 15, m: { hello: 'world3' }},
                sign = `/${JSON.stringify(message)}${bookingKey2}default`;
            message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
            wsConnection2.send(JSON.stringify(message));
        });
        it('Both players should /checkBattleNoSearch', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');

                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({ stat: 'MM: neither in queue nor in battle', c: -1 });

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.checkBattleNoSearch', null, unicorn1, cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.checkBattleNoSearch', null, unicorn2, cb)
            ], callbackFn);
        });
        it.skip('Both players should get battles listing', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');

                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                delete body1.now;
                delete body2.now;

                expect(body1).to.deep.equal(body2);
                expect(body2.l.length).to.be.equal(2);

                expect(body2.l[0].auto).to.be.equal(false);
                expect(body2.l[0].hida).to.be.equal(1);
                expect(body2.l[0].hidb).to.be.equal(2);
                expect(body2.l[0].id).to.be.equal(4);
                expect(body2.l[0]).to.have.property('cat');
                expect(body2.l[0].dsp.hello).to.be.equal('world');
                expect(body2.l[0].dsp).to.not.have.property('lagA');
                expect(body2.l[0].dsp).to.not.have.property('lagB');
                expect(body2.l[0].dsp).to.not.have.property('theModelIsNull');

                expect(body2.l[1].auto).to.be.equal(true);
                expect(body2.l[1].hida).to.be.equal(1);
                expect(body2.l[1].hidb).to.be.equal(2);
                expect(body2.l[1].id).to.be.equal(3);
                expect(body2.l[1]).to.have.property('cat');
                expect(body2.l[1].dsp.hello).to.be.equal('world');
                expect(body2.l[1].dsp).to.have.property('lagA');
                expect(body2.l[1].dsp).to.have.property('lagB');
                expect(body2.l[1].dsp.theModelIsNull).to.be.equal(false);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn1, cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn2, cb)
            ], callbackFn);
        });
        it.skip('Both players should get battles listing with auto=1', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');

                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                delete body1.now;
                delete body2.now;

                expect(body1).to.deep.equal(body2);
                expect(body2.l.length).to.be.equal(1);

                expect(body2.l[0].auto).to.be.equal(true);
                expect(body2.l[0].hida).to.be.equal(1);
                expect(body2.l[0].hidb).to.be.equal(2);
                expect(body2.l[0].id).to.be.equal(3);
                expect(body2.l[0]).to.have.property('cat');
                expect(body2.l[0].dsp.hello).to.be.equal('world');
                expect(body2.l[0].dsp).to.have.property('lagA');
                expect(body2.l[0].dsp).to.have.property('lagB');
                expect(body2.l[0].dsp.theModelIsNull).to.be.equal(false);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', { auto: 1 }, unicorn1, cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', { auto: 1 }, unicorn2, cb)
            ], callbackFn);
        });
        it('Should erase battles', done => {
            let callbackFn = err => {
                expect(err).to.be.a('null');

                done();
            };

            BattleModel.deleteMany({}, callbackFn);
        });
    });
    describe('Case #5', () => {
        var gameroomHost, gameroomPort,
            bookingKey1, bookingKey2;

        it(`Should wait ${1005} ms`, done => setTimeout(done, 1005));
        it('Both players should find each other', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({stat: 'MM: accept or decline the game', c: 1});

                done();
            };

            async.parallel([
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
            ], callbackFn);
        });
        it('First player should accept match', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({stat: 'MM: waiting for opponent to accept the game', c: 2});

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
        });
        it('Second player should accept match', done => {
            var firstIsOkay = false, secondIsOkay = false,
                keyOne;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                gameroomHost = body.address.hosts.asDomain;
                gameroomPort = body.address.ports.ws;
                bookingKey1 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                firstIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                bookingKey2 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                secondIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
        });
        it('First player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 0, m: 'GR: pair allocated. Wait for opponent'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
        });
        it('Second player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: pair formed'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
        });
        it('First player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: payload set'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, callbackFn);
        });
        it('Second player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 2, m: 'GR: set ready'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, callbackFn);
        });
        it('First player should set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload' }});

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
                expect(body).to.deep.equal({
                    p: 4, c: 3,
                    m: 'GR: gameplay model established',
                    oppPayload: { some: 'payload' }
                });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
        });

        var wsConnection1, wsConnection2;

        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 1,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection1.on('message', message => {
                if (!messageIsOkay) {
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
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 0,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection2.on('message', message => {
                if (!messageIsOkay) {
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 3')));
        });
        it('Second player should surrender', done => {
            var surrenderIsOkay, messageIsOkay, theMessage;

            let generalCallbackFn = () => {
                if (surrenderIsOkay && messageIsOkay) {
                    expect(theMessage).to.deep.equal({ c: -1, m: 'GR: auto gameover', dsp: { hidA: 1, hidB: 2, lagA: 0, lagB: Number.MAX_VALUE }});

                    wsConnection1.removeAllListeners('error');
                    wsConnection1.removeAllListeners('message');
                    wsConnection1.removeAllListeners('close');

                    done();
                }
            };

            wsConnection1.on('error', err => done(err));
            wsConnection1.on('message', () => done(new Error('WTF 3')));
            wsConnection1.on('close', (code, reason) => {
                if (!messageIsOkay) {
                    messageIsOkay = true;
                    theMessage = JSON.parse(reason);
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });

            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');

                expect(response.statusCode).to.be.equal(200);

                surrenderIsOkay = true;
                generalCallbackFn();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'surrender', null, null, bookingKey2, callbackFn);
        });
        it.skip('Both players should get battles listing', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');

                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                delete body1.now;
                delete body2.now;

                expect(body1).to.deep.equal(body2);
                expect(body2.l.length).to.be.equal(1);
                expect(body2.l[0].auto).to.be.equal(true);
                expect(body2.l[0].hida).to.be.equal(1);
                expect(body2.l[0].hidb).to.be.equal(2);
                expect(body2.l[0].id).to.be.equal(5);
                expect(body2.l[0]).to.have.property('cat');
                expect(body2.l[0].dsp.hello).to.be.equal('world');
                expect(body2.l[0].dsp).to.have.property('lagA');
                expect(body2.l[0].dsp).to.have.property('lagB');
                expect(body2.l[0].dsp.theModelIsNull).to.be.equal(false);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn1, cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn2, cb)
            ], callbackFn);
        });

        it('Both players should /checkBattleNoSearch', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');

                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({stat: 'MM: neither in queue nor in battle', c: -1});

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.checkBattleNoSearch', null, unicorn1, cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.checkBattleNoSearch', null, unicorn2, cb)
            ], callbackFn);
        });
        it('Both players should find each other', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({stat: 'MM: accept or decline the game', c: 1});

                done();
            };

            async.parallel([
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
            ], callbackFn);
        });
        it('Should erase battles', done => {
            let callbackFn = err => {
                expect(err).to.be.a('null');

                done();
            };

            BattleModel.deleteMany({}, callbackFn);
        });
    });
    describe('Case #6', () => {
        var gameroomHost, gameroomPort,
            bookingKey1, bookingKey2;

        it('Both players should find each other', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({stat: 'MM: accept or decline the game', c: 1});

                done();
            };

            async.parallel([
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
            ], callbackFn);
        });
        it('First player should accept match', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({stat: 'MM: waiting for opponent to accept the game', c: 2});

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
        });
        it('Second player should accept match', done => {
            var firstIsOkay = false, secondIsOkay = false,
                keyOne;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                gameroomHost = body.address.hosts.asDomain;
                gameroomPort = body.address.ports.ws;
                bookingKey1 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                firstIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);

            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                bookingKey2 = body.key;

                if (keyOne) {
                    expect(body.key).to.not.be.equal(keyOne);
                } else {
                    keyOne = body.key;
                }

                secondIsOkay = true;
                if (firstIsOkay && secondIsOkay) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
        });
        it('First player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 0, m: 'GR: pair allocated. Wait for opponent'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, callbackFn);
        });
        it('Second player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: pair formed'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, callbackFn);
        });
        it('First player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 1, m: 'GR: payload set'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, callbackFn);
        });
        it('Second player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({c: 2, m: 'GR: set ready'});

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, callbackFn);
        });
        it('First player should set ready', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { some: 'payload' }});

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
                expect(body).to.deep.equal({
                    p: 4, c: 3,
                    m: 'GR: gameplay model established',
                    oppPayload: { some: 'payload' }
                });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
        });

        var wsConnection1, wsConnection2;

        it('First player should connect ws with gameroom', done => {
            let callbackFn = () => {
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 1,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection1.on('message', message => {
                if (!messageIsOkay) {
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
                if (openIsOk && messageIsOkay) {
                    expect(theMessage).to.have.property('state');
                    expect(theMessage.state).to.have.property('model');
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('paused', 0);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 0,
                            "model": {
                                "plrA": {
                                    "some": "payload"
                                },
                                "plrB": {
                                    "some": "payload"
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
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
                if (!openIsOk) {
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection2.on('message', message => {
                if (!messageIsOkay) {
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection2.on('close', () => done(new Error('WTF 3')));
        });
        it('First player should disconnect after 1 second from beginning', done => {
            setTimeout(() => {
                wsConnection2.on('error', err => done(err));
                wsConnection2.on('open', () => done(new Error('WTF 1')));
                wsConnection2.on('message', msg => {
                    msg = JSON.parse(msg);
                    expect(msg).to.have.property('from');
                    delete msg.from;
                    expect(msg).to.deep.equal({ p: 4, c: 3, m: 'GR: opponent disconnected', paused: 1, turn: 0 });

                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('open');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                });
                wsConnection2.on('close', () => done(new Error('WTF 3')));
                wsConnection1.close();
            }, 1000);
        });
        it('First player should get new unicorn', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorn1 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId1,
                gclientsecret: gClientSecret1
            }, null, null, callbackFn);
        });
        it('First player should get it profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn1, callbackFn);
        });
        it('First player should /checkBattleNoSearch', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({
                    stat: 'MM: gameroom allocated', c: 4,
                    address: JSON.parse(gameplayRoom._getIpAddress()),
                    key: bookingKey1
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.checkBattleNoSearch', null, unicorn1, callbackFn);
        });
        it('First player should surrender', done => {
            var surrenderIsOkay, messageIsOkay, theMessage;

            let generalCallbackFn = () => {
                if (surrenderIsOkay && messageIsOkay) {
                    expect(theMessage).to.deep.equal({ c: -1, m: 'GR: auto gameover', dsp: { hidA: 1, hidB: 2, lagA: Number.MAX_VALUE, lagB: 0 }});

                    wsConnection2.removeAllListeners('error');
                    wsConnection2.removeAllListeners('message');
                    wsConnection2.removeAllListeners('close');

                    done();
                }
            };

            wsConnection2.on('error', err => done(err));
            wsConnection2.on('message', () => done(new Error('WTF 3')));
            wsConnection2.on('close', (code, reason) => {
                if (!messageIsOkay) {
                    messageIsOkay = true;
                    theMessage = JSON.parse(reason);
                    generalCallbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });

            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');

                expect(response.statusCode).to.be.equal(200);

                surrenderIsOkay = true;
                generalCallbackFn();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'surrender', null, null, bookingKey1, callbackFn)
        });
        it.skip('First player should get battles listing', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                delete body.now;

                expect(body.l.length).to.be.equal(1);
                expect(body.l[0].auto).to.be.equal(true);
                expect(body.l[0].hida).to.be.equal(1);
                expect(body.l[0].hidb).to.be.equal(2);
                expect(body.l[0].id).to.be.equal(6);
                expect(body.l[0]).to.have.property('cat');
                expect(body.l[0].dsp.hello).to.be.equal('world');
                expect(body.l[0].dsp).to.have.property('lagA');
                expect(body.l[0].dsp).to.have.property('lagB');
                expect(body.l[0].dsp.theModelIsNull).to.be.equal(false);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn1, callbackFn);
        });
        it('Both players should find each other', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({stat: 'MM: accept or decline the game', c: 1});

                done();
            };

            async.parallel([
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
            ], callbackFn);
        });
    });

    describe('Stuff', () => {
        it('Should change back pairs capacity', () => {
            goblinBase.pvpConfig.pairsCapacity = cachedPairsCapacity;
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