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
    const _PLATFORM_VERSION = 'ios;0.0.2';

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
        it('Should try to release booking with wrong sequence counter', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                if(!_.isObject(body)){
                    body = JSON.parse(body);
                }
                expect(body).to.deep.equal(new ErrorResponse(397, 'HMAC: sequence mismatch'));

                done();
            };

            var seq = 2,
                sign = `/api/v0/releaseBooking${seq}${bookingKey1}default`,
                hmacSign = crypto.createHash('sha256').update(Buffer.from(sign), 'binary').digest('hex');
            request.post({
                url: `http://${gameroomHost}:${gameroomPort}/api/v0/releaseBooking`,
                headers: {
                    'x-platform-version': _PLATFORM_VERSION,
                    'x-book-key': bookingKey1,
                    'x-req-seq': seq,
                    'x-request-sign': hmacSign
                }
            }, callbackFn);
        });
        it('Should wait ~1 sec', done => setTimeout(done, goblinBase.pvpConfig.numericConstants.messageLockTtlMs));
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

            testUtils.pvp.thePost(gameroomHost, gameroomPort, 'setPayload', null, {
                player: 1, payload: 'alpha'
            }, bookingKey1, callbackFn);
        });
        it('Second player should set payload', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ c: 2, m: 'GR: set ready' });

                done();
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
    });
    describe('Case #5', () => {
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

                expect(body).to.deep.equal({ c: 2, m: 'GR: waiting opponent', oppPayload: { player: 2, payload: 'beta' } });

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
                    expect(thirdMessage).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { player: 2, payload: 'beta' } });

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
                expect(body).to.deep.equal({ p: 4, c: 3, m: 'GR: gameplay model established', oppPayload: { player: 1, payload: 'alpha' } });

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
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('from');
                    delete theMessage.from;
                    expect(theMessage).to.have.property('paused', 1);
                    delete theMessage.paused;
                    expect(theMessage).to.deep.equal({
                        "c": 4,
                        "state": {
                            "playerTurnA": 0,
                            "playerTurnB": 0,
                            "isA": 1,
                            "model": {
                                "plrA": {
                                    "player": 1,
                                    "payload": "alpha"
                                },
                                "plrB": {
                                    "player": 2,
                                    "payload": "beta"
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
                    expect(theMessage.state).to.have.property('randomSeed');
                    expect(theMessage.state).to.have.property('startTs');
                    expect(theMessage.state).to.have.property('opponentPayload');
                    delete theMessage.state.opponentPayload;
                    delete theMessage.state.randomSeed;
                    delete theMessage.state.startTs;
                    expect(theMessage).to.have.property('to');
                    delete theMessage.to;
                    expect(theMessage).to.have.property('from');
                    delete theMessage.from;
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
                                    "player": 1,
                                    "payload": "alpha"
                                },
                                "plrB": {
                                    "player": 2,
                                    "payload": "beta"
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
                    expect(JSON.parse(msg)).to.deep.equal({ oppsq: n + 1, m: { hello: 'world' } });

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
                    expect(JSON.parse(msg)).to.deep.equal({ oppsq: n + 1, m: { russo: 'turisto' } });

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
                    expect(secondMessage).to.deep.equal({ gameIsOver: true, finalm: { m: { hello: 'world3' }, asq: 14, bsq: 15 } });

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
        it('Should list battles', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('now');
                expect(body.l.length).to.be.equal(1);
                expect(body.l[0]).to.have.property('hida');
                expect(body.l[0]).to.have.property('hidb');
                expect(body.l[0]).to.have.property('cat');
                delete body.l[0].cat;
                expect(body.l[0]).to.deep.equal({
                    id: 1,
                    auto: false,
                    hida: 1,
                    hidb: 2,
                    dsp: { hello: 'world' }
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'battles.listBattles', null, unicorn1, callbackFn);
        });
    });
    describe('Stress test', () => {
        const N = 20, R = 1000;

        var cachedCapacity, mmRadCached;

        it('Should do some stuff', () => {
            cachedCapacity = goblinBase.pvpConfig.pairsCapacity;
            goblinBase.pvpConfig.pairsCapacity = N;

            mmRadCached = goblinBase.matchmakingConfig.numericConstants.limitLeaderboardRadius;
            goblinBase.matchmakingConfig.numericConstants.limitLeaderboardRadius = R;
        });
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        it('Should get room occupation by hand ¯\\_(ツ)_/¯', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');

                expect(+response).to.be.equal(N);

                done();
            };

            opClients.getGameplayRoomClient().getOccupation([N], callbackFn);
        });
        it('Should add room to matchmaking by hand', done => {
            let callbackFn = err => {
                expect(err).to.be.a('null');

                done();
            };

            var ipAddress = gameplayRoom._getIpAddress();
            opClients.getMatchmakingClient().getRedis().zadd('grooms', N, ipAddress, callbackFn);
        });

        var unicorns = [];

        _(N * 2).times(n => {
            it(`Should add account ${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    unicorns.push(_unicorn);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it(`Should add profile ${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
            });
        });
        _(N).times(n => {
            var recordCache;

            it(`Should post record for player ${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    done();
                };

                recordCache = _.random(2, R);
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: recordCache,
                    segment: 'segma'
                }, null, unicorns[n], callbackFn);
            });
            it(`Should post record for player ${n + N + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    done();
                };

                var thisRecord = _.coinFlip() ? recordCache + 1 : recordCache - 1;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: thisRecord,
                    segment: 'segma'
                }, null, unicorns[n + N], callbackFn);
            });
            it(`Players ${n + 1} and ${n + N + 1} should find each other`, done => {
                let callbackFn = (err, responses) => {
                    expect(err).to.be.a('null');
                    expect(responses[0][0].statusCode).to.be.equal(200);
                    expect(responses[1][0].statusCode).to.be.equal(200);

                    var body1 = responses[0][1],
                        body2 = responses[1][1];

                    delete body1.opppid;
                    delete body2.opppid;

                    expect(body1).to.deep.equal(body2);
                    expect(body2).to.deep.equal({stat: 'MM: accept or decline the game', c: 1});

                    done();
                };

                async.parallel([
                    cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[n], cb),
                    cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[n + N], cb)
                ], callbackFn);
            });
        });

        var gameroomAddresses = [], bookingKeys = [];

        _(N).times(n => {
            it(`Player ${n + 1} should accept match`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({stat: 'MM: waiting for opponent to accept the game', c: 2});

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorns[n], callbackFn);
            });

            var gameroomAddress,
                bookingKey1, bookingKey2;

            it(`Player ${n + N + 1} should accept match`, done => {
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

                    gameroomAddresses.push({ host: body.address.hosts.asDomain, port: body.address.ports.ws });
                    gameroomAddress = `${body.address.hosts.asDomain}:${body.address.ports.ws}`;
                    bookingKey1 = body.key;
                    bookingKeys[n] = body.key;

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

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorns[n], callbackFn1);

                let callbackFn2 = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.have.property('stat', 'MM: gameroom allocated');
                    expect(body).to.have.property('c', 3);
                    expect(body).to.have.property('address');
                    expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                    expect(body).to.have.property('key');

                    bookingKey2 = body.key;
                    bookingKeys[n + N] = body.key;

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

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorns[n + N], callbackFn2);
            });
            it(`Player ${n} should release booking in gameroom`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({c: 0, m: 'GR: pair allocated. Wait for opponent'});

                    done();
                };

                testUtils.pvp.thePost(gameroomAddresses[n].host, gameroomAddresses[n].port, 'releaseBooking', null, null, bookingKeys[n], callbackFn);
            });
            it(`Player ${n + N + 1} should release booking in gameroom`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({c: 1, m: 'GR: pair formed'});

                    done();
                };

                testUtils.pvp.thePost(gameroomAddresses[n].host, gameroomAddresses[n].port, 'releaseBooking', null, null, bookingKeys[n + N], callbackFn);
            });
            it(`Player ${n + 1} should set payload`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({c: 1, m: 'GR: payload set'});

                    done();
                };

                testUtils.pvp.thePost(gameroomAddresses[n].host, gameroomAddresses[n].port, 'setPayload', null, {
                    player: 1, payload: 'alpha'
                }, bookingKeys[n], callbackFn);
            });
            it(`Player ${n + N + 1} should set payload`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({c: 2, m: 'GR: set ready'});

                    done();
                };

                testUtils.pvp.thePost(gameroomAddresses[n].host, gameroomAddresses[n].port, 'setPayload', null, {
                    player: 2, payload: 'beta'
                }, bookingKeys[n + N], callbackFn);
            });
            it(`Player ${n + 1} should set ready`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.a('null');
                    expect(response.statusCode).to.be.equal(200);

                    expect(body).to.deep.equal({
                        c: 2,
                        m: 'GR: waiting opponent',
                        oppPayload: {player: 2, payload: 'beta'}
                    });

                    done();
                };

                testUtils.pvp.thePost(gameroomAddresses[n].host, gameroomAddresses[n].port, 'setReady', null, null, bookingKeys[n], callbackFn);
            });
            it(`Player ${n + N + 1} should set ready`, done => {
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
                        p:4, c: 3,
                        m: 'GR: gameplay model established',
                        oppPayload: {player: 1, payload: 'alpha'}
                    });

                    done();
                };

                testUtils.pvp.thePost(gameroomAddresses[n].host, gameroomAddresses[n].port, 'setReady', null, null, bookingKeys[n + N], callbackFn);
            });
            it(`Player ${n + 1} should connect ws with gameroom`, done => {
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
                                        "player": 1,
                                        "payload": "alpha"
                                    },
                                    "plrB": {
                                        "player": 2,
                                        "payload": "beta"
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

                var wsConnection = new WebSocket(`ws://${gameroomAddresses[n].host}:${gameroomAddresses[n].port}/?bkey=${bookingKeys[n]}&pv=${_PLATFORM_VERSION}`),
                    openIsOk = false, messageIsOkay = false, theMessage;

                wsConnection.on('error', err => done(err));
                wsConnection.on('open', () => {
                    if (!openIsOk) {
                        openIsOk = true;
                        callbackFn();
                    } else {
                        done(new Error('WTF 1'));
                    }
                });
                wsConnection.on('message', message => {
                    if (!messageIsOkay) {
                        messageIsOkay = true;
                        theMessage = JSON.parse(message);
                        callbackFn();
                    } else {
                        done(new Error('WTF 2'));
                    }
                });
                wsConnection.on('close', () => done(new Error('WTF 3')));
            });
            it(`Player ${n + N + 1} should connect ws with gameroom`, done => {
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
                                        "player": 1,
                                        "payload": "alpha"
                                    },
                                    "plrB": {
                                        "player": 2,
                                        "payload": "beta"
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

                var wsConnection = new WebSocket(`ws://${gameroomAddresses[n].host}:${gameroomAddresses[n].port}/?bkey=${bookingKeys[n + N]}&pv=${_PLATFORM_VERSION}`),
                    openIsOk = false, messageIsOkay = false, theMessage;

                wsConnection.on('error', err => done(err));
                wsConnection.on('open', () => {
                    if (!openIsOk) {
                        openIsOk = true;
                        callbackFn();
                    } else {
                        done(new Error('WTF 1'));
                    }
                });
                wsConnection.on('message', message => {
                    if (!messageIsOkay) {
                        messageIsOkay = true;
                        theMessage = JSON.parse(message);
                        callbackFn();
                    } else {
                        done(new Error('WTF 2'));
                    }
                });
                wsConnection.on('close', () => done(new Error('WTF 3')));
            });
        });

        it('Should undo some stuff', () => {
            goblinBase.pvpConfig.pairsCapacity = cachedCapacity;
            goblinBase.matchmakingConfig.numericConstants.limitLeaderboardRadius = mmRadCached;
        });
    });
    describe('Check gameplay room ping functionality', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        var roomOccupation;

        it('Should wait for 1.5 sec to proc gameroom heartBeat', done => {
            setTimeout(done, 1500);
        });
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
        it('Should shutdown gameplayRoom and wait 4000 ms', done => {
            gameplayRoom.clear();

            setTimeout(done, 4000);
        });
        it('First player should try to accept match', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn1, callbackFn);
        });
        it('Both players get "No more rooms" message', done => {
            var doneCounter = 0;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: no more rooms');
                expect(body).to.have.property('c', -1);

                if (++doneCounter === 2) {
                    done();
                }
            };
            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(503);

                expect(body).to.have.property('message', 'No more free rooms');

                if (++doneCounter === 2) {
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn1);
            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn2);
        });
        it('Should rerun heartbeat', () => {
            gameplayRoom._rerunHeartbeat();
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