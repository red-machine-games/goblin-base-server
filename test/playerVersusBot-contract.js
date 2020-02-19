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
    const _PLATFORM_VERSION = 'ios;0.0.2',
        N = 15;

    describe('Case #1', () => {
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

        var unicorn, f_unicorn,
            f_hid;

        it('Should add account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should add profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should post record for player', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 2,
                segment: 'segma'
            }, null, unicorn, callbackFn);
        });
        it('Player should try to find human opponent', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn, callbackFn);
        });
        it('Player should stop trying to find human opponent', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: no more waiting', c: -1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorn, callbackFn);
        });
        it('Should add account for fictive player', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                f_unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should add profile for fictive player', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, f_unicorn, callbackFn);
        });
        it('Should get Human ID of recently created player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                f_hid = body.humanId;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, f_unicorn, callbackFn);
        });
        it('Player should find this fictive opponent', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.handSelectOpponent', { hid: f_hid }, unicorn, callbackFn);
        });

        var gameroomHost, gameroomPort, bookingKey;

        it('Player should accept match with fictive opponent', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                gameroomHost = body.address.hosts.asDomain;
                gameroomPort = body.address.ports.ws;
                bookingKey = body.key;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn, callbackFn);
        });
        it('Player should release booking in gameroom', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 1, m: 'GR: pair formed' });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey, callbackFn);
        });
        it('Player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: set ready' });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey, callbackFn);
        });
        it('Player should set ready', done => {
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
                    p: 4, c: 3, m: 'GR: gameplay model established',
                    oppPayload: { isPlayerB: true, isBot: true, bpd: { hello: 'world' }}
                });

                done();
            };

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey, callbackFn);
        });

        var wsConnection;

        it('First player should connect ws with gameroom', done => {
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
                                    "isPlayerB": true,
                                    "isBot": true,
                                    "bpd": {
                                        "hello": "world"
                                    }
                                },
                                "plrAsq": 0,
                                "plrBsq": 0
                            }
                        }
                    });

                    wsConnection.removeAllListeners('error');
                    wsConnection.removeAllListeners('open');
                    wsConnection.removeAllListeners('message');
                    wsConnection.removeAllListeners('close');

                    done();
                }
            };

            wsConnection = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey}&pv=${_PLATFORM_VERSION}`);
            var openIsOk = false, messageIsOkay = false, theMessage;

            wsConnection.on('error', err => done(err));
            wsConnection.on('open', () => {
                if(!openIsOk){
                    openIsOk = true;
                    callbackFn();
                } else {
                    done(new Error('WTF 1'));
                }
            });
            wsConnection.on('message', message => {
                if(!messageIsOkay){
                    messageIsOkay = true;
                    theMessage = JSON.parse(message);
                    callbackFn();
                } else {
                    done(new Error('WTF 2'));
                }
            });
            wsConnection.on('close', () => done(new Error('WTF 3')));
        });
        _(N - 1).times(n => {
            it(`Should make move №${n + 1} and wait 1 second`, done => {
                wsConnection.on('error', err => done(err));
                wsConnection.on('open', () => done(new Error('WTF 1')));
                wsConnection.on('message',(msg) => {
                    console.error(msg);
                    done(new Error('WTF 2'))
                });
                wsConnection.on('close', () => done(new Error('WTF 3')));

                let message = { mysq: n + 1, m: { hello: 'world' } },
                    sign = `/${JSON.stringify(message)}${bookingKey}default`;
                message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
                wsConnection.send(JSON.stringify(message));

                setTimeout(() => {
                    wsConnection.removeAllListeners('error');
                    wsConnection.removeAllListeners('open');
                    wsConnection.removeAllListeners('message');
                    wsConnection.removeAllListeners('close');

                    done();
                }, 1000);
            });
        });
        it('Player should finish battle', done => {
            var code, closeMessage;

            let callbackFn = () => {
                expect(code).to.be.equal(4200);
                expect(closeMessage).to.deep.equal({ gameIsOver: true, finalm: { m: { hello: 'world3' }, asq: 15, bsq: 0 } });

                wsConnection.removeAllListeners('error');
                wsConnection.removeAllListeners('open');
                wsConnection.removeAllListeners('message');
                wsConnection.removeAllListeners('close');

                done();
            };

            wsConnection.on('error', err => done(err));
            wsConnection.on('open', () => done(new Error('WTF 1')));
            wsConnection.on('message', () => done(new Error('WTF 2')));
            wsConnection.on('close', (_code, reason) => {
                code = _code;
                closeMessage = JSON.parse(reason);
                callbackFn();
            });

            let message = { mysq: 15, m: { hello: 'world3' } },
                sign = `/${JSON.stringify(message)}${bookingKey}default`;
            message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
            wsConnection.send(JSON.stringify(message));
        });
        it('Lets wait 1000 ms', done => {
            setTimeout(done, 1000);
        });
        it('Should list battles', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('now');
                expect(body.l.length).to.be.equal(1);
                expect(body.l[0]).to.have.property('hida');
                expect(body.l[0]).to.not.have.property('hidb');
                expect(body.l[0]).to.have.property('cat');
                delete body.l[0].cat;
                expect(body.l[0]).to.deep.equal({
                    id: 1,
                    auto: false,
                    hida: 1,
                    dsp: { hello: 'world' }
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn, callbackFn);
        });
    });
    describe('Case #2', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
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

        var unicorn, f_hid = 2;

        it('Should add account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should add profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should post record for player', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 2,
                segment: 'segma'
            }, null, unicorn, callbackFn);
        });
        it('Player should try to find human opponent', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn, callbackFn);
        });
        it('Player should stop trying to find human opponent', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: no more waiting', c: -1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorn, callbackFn);
        });
        it('Player should try to find fictive opponent', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(404);

                expect(body).to.deep.equal(new ErrorResponse(806, 'Didn\'t found hand selected opponent'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.handSelectOpponent', { hid: f_hid }, unicorn, callbackFn);
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