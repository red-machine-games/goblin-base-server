'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    request = require('request'),
    WebSocket = require('ws'),
    crypto = require('crypto');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./testEntryPoint.js').START_AT_PORT;

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
describe('The case', () => {
    const _PLATFORM_VERSION = 'ios;0.0.2';

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

    var unicorn1, unicorn2;

    it('Should add account 1', done => {
        let callbackFn = (err, response, body, _unicorn) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

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
    it('Both players should find each other', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            expect(body1).to.deep.equal(body2);
            expect(body2).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

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

            expect(body).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
    });

    var gameroomHost, gameroomPort,
        bookingKey1, bookingKey2;

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

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            firstIsOkay = true;
            if(firstIsOkay && secondIsOkay){
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

            if(keyOne){
                expect(body.key).to.not.be.equal(keyOne);
            } else {
                keyOne = body.key;
            }

            secondIsOkay = true;
            if(firstIsOkay && secondIsOkay){
                done();
            }
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
    });
    it('Both players should release booking, set payload, set ready and connect ws in parallel', done => {
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

            expect(body1.c).to.be.oneOf([0, 1]);
            expect(body1.m).to.be.oneOf(['GR: pair allocated. Wait for opponent', 'GR: pair formed']);
            expect(body4.c).to.be.oneOf([0, 1]);
            expect(body4.m).to.be.oneOf(['GR: pair allocated. Wait for opponent', 'GR: pair formed']);

            expect(body2.c).to.be.oneOf([1, 2]);
            expect(body2.m).to.be.oneOf(['GR: payload set', 'GR: set ready']);
            expect(body5.c).to.be.oneOf([1, 2]);
            expect(body5.m).to.be.oneOf(['GR: payload set', 'GR: set ready']);

            expect(body3.c).to.be.oneOf([2, 3]);
            expect(body3.m).to.be.oneOf(['GR: waiting opponent', 'GR: gameplay model established']);
            expect(body3.oppPayload).to.be.deep.equal({ some: 'payload' });
            expect(body6.c).to.be.oneOf([2, 3]);
            expect(body6.m).to.be.oneOf(['GR: waiting opponent', 'GR: gameplay model established']);
            expect(body6.oppPayload).to.be.deep.equal({ some: 'payload' });

            expect(responses[0][3]).to.have.property('c', 4);
            expect(responses[0][3]).to.have.property('state');
            expect(responses[1][3]).to.have.property('c', 4);
            expect(responses[1][3]).to.have.property('state');

            done();
        };





        async.parallel([
            cb => async.series([
                cbb => testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey1, cbb),
                cbb => testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey1, cbb),
                cbb => testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey1, cbb),
                cbb => {
                    let cbfn = () => {
                        if (openIsOk && messageIsOkay) {
                            ws.removeAllListeners('error');
                            ws.removeAllListeners('open');
                            ws.removeAllListeners('message');
                            ws.removeAllListeners('close');
                            ws.close();

                            cbb(null, theMessage);
                        }
                    };

                    var ws = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey1}&pv=${_PLATFORM_VERSION}`);
                    var openIsOk = false, messageIsOkay = false, theMessage;

                    ws.on('error', err => cbb(err));
                    ws.on('open', () => {
                        if (!openIsOk) {
                            openIsOk = true;
                            cbfn();
                        } else {
                            cbb(new Error('WTF 1'));
                        }
                    });
                    ws.on('message', message => {
                        if (!messageIsOkay) {
                            messageIsOkay = true;
                            theMessage = JSON.parse(message);
                            cbfn();
                        } else {
                            cbb(new Error('WTF 2'));
                        }
                    });
                    ws.on('close', () => cbb(new Error('WTF 3')));
                }
            ], cb),
            cb => async.series([
                cbb => testUtils.pvp.thePost(gameroomHost, gameroomPort, 'releaseBooking', null, null, bookingKey2, cbb),
                cbb => testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, { some: 'payload' }, bookingKey2, cbb),
                cbb => testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, cbb),
                cbb => {
                    let cbfn = () => {
                        if(openIsOk && messageIsOkay){
                            ws.removeAllListeners('error');
                            ws.removeAllListeners('open');
                            ws.removeAllListeners('message');
                            ws.removeAllListeners('close');
                            ws.close();

                            cbb(null, theMessage);
                        }
                    };

                    var ws = new WebSocket(`ws://${gameroomHost}:${gameroomPort}/?bkey=${bookingKey2}&pv=${_PLATFORM_VERSION}`);
                    var openIsOk = false, messageIsOkay = false, theMessage;

                    ws.on('error', err => cbb(err));
                    ws.on('open', () => {
                        if(!openIsOk){
                            openIsOk = true;
                            cbfn();
                        } else {
                            cbb(new Error('WTF 1'));
                        }
                    });
                    ws.on('message', message => {
                        if(!messageIsOkay){
                            messageIsOkay = true;
                            theMessage = JSON.parse(message);
                            cbfn();
                        } else {
                            cbb(new Error('WTF 2'));
                        }
                    });
                    ws.on('close', () => cbb(new Error('WTF 3')));
                }
            ], cb),

        ], callbackFn);
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