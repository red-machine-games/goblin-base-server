'use strict';

var expect = require('chai').expect,
    async = require('async'),
    WebSocket = require('ws'),
    crypto = require('crypto');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./testEntryPoint.js').START_AT_PORT;

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

    var wsConnection1, wsConnection2;

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
    it('First player should ping pre game room', done => {
        let callbackFn = () => {
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

        let message = { ping: 10 },
            sign = `/${JSON.stringify(message)}${bookingKey1}default`;
        message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
        wsConnection1.send(JSON.stringify(message));
    });
    it('Second player should ping pre game room', done => {
        let callbackFn = () => {
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

        let message = { ping: 10 },
            sign = `/${JSON.stringify(message)}${bookingKey1}default`;
        message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
        wsConnection2.send(JSON.stringify(message));
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
                expect(message1).to.deep.equal({ p: 2, m: 'PRGS: all payloads set', isA: true, oppPayload: { player: 2, payload: 'beta' } });
                expect(message2).to.deep.equal({ p: 2, m: 'PRGS: all payloads set', isA: false, oppPayload: { player: 1, payload: 'alpha' } });

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
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { player: 2, payload: 'beta' } });

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
            expect(body).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { player: 1, payload: 'alpha' } });

            done();
        };

        testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setReady', null, null, bookingKey2, callbackFn);
    });
    it('First player should ping pre game room', done => {
        let callbackFn = () => {
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

        let message = { ping: 10 },
            sign = `/${JSON.stringify(message)}${bookingKey1}default`;
        message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
        wsConnection1.send(JSON.stringify(message));
    });
    it('Second player should ping pre game room', done => {
        let callbackFn = () => {
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

        let message = { ping: 10 },
            sign = `/${JSON.stringify(message)}${bookingKey1}default`;
        message.sign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
        wsConnection2.send(JSON.stringify(message));
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