'use strict';

var expect = require('chai').expect,
    async = require('async');

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
describe('The cases', () => {
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
        it('Two players should find each other', done => {
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
        it('Second player should accept match', done => {
            var firstIsOkay = false, secondIsOkay = false,
                keyOne;

            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

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

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

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

        var unicorn1, unicorn2, unicorn3;

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
                value: 1,
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
        it('Should add account 3', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                unicorn3 = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should add profile 3', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn3, callbackFn);
        });
        it('Should post record for third player', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 2,
                segment: 'segma'
            }, null, unicorn3, callbackFn);
        });
        it('Should try to search opponents for first and second players', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({ stat: 'MM: searching', c: 0 });

                done();
            };

            async.parallel([
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, cb)
            ], callbackFn);
        });
        it('Should find opponent for third player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn3, callbackFn)
        });
        it('Should find opponent for second player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, callbackFn);
        });
        it('Should try to find opponent for first player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, callbackFn);
        });
        it('Should stop searching for first player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: no more waiting', c: -1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorn1, callbackFn);
        });
        it('Should accept match for third player', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: waiting for opponent to accept the game', c: 2 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn3, callbackFn);
        });
        it('Second player should decline match', done => {
            var firstIsOkay = false, secondIsOkay = false;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: your opponent declined match', c: -1 });

                firstIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn3, callbackFn1);

            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: match declined', c: -1 });

                secondIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorn2, callbackFn2);
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
        it('First player should try to begin search', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(296, 'You do not have a record in that segment'));

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, callbackFn);
        });
        it('Should post record for first player', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 1,
                segment: 'segma'
            }, null, unicorn1, callbackFn);
        });
        it('First player should begin search', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, callbackFn);
        });
        it(`Should wait for ~3000 ms`, done => {
            setTimeout(done, goblinBase.matchmakingConfig.numericConstants.timeForSearchMs - goblinBase.matchmakingConfig.numericConstants.longPollingColdResponseAfterMs);
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
        it('Should post record for second player', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 2,
                segment: 'segma'
            }, null, unicorn2, callbackFn);
        });
        it('Second player should begin search', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, callbackFn);
        });
        it('Both players should find each other', done => {
            var firstIsOkay = false, secondIsOkay = false;

            let callbackFn1 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                firstIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, callbackFn1);

            let callbackFn2 = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                secondIsOkay = true;
                if(firstIsOkay && secondIsOkay){
                    done();
                }
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, callbackFn2);
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
        it(`Should wait ~6000 ms`, done => {
            setTimeout(done, goblinBase.matchmakingConfig.numericConstants.timeForAcceptanceMs);
        });
        it('First player should try to wait for opponent to accept', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: timeout', c: -1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.waitForOpponentToAccept', null, unicorn1, callbackFn);
        });
        it('Second player should try to accept match', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(316, 'Not in queue'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorn2, callbackFn);
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
        it('First player should try to start searching again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, callbackFn);
        });
        it('Second player should try to start searching again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.have.property('stat', 'MM: gameroom allocated');
                expect(body).to.have.property('c', 3);
                expect(body).to.have.property('address');
                expect(body.address).to.deep.equal(JSON.parse(gameplayRoom._getIpAddress()));
                expect(body).to.have.property('key');

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn2, callbackFn);
        });
        it(`Should wait ~6000 ms`, done => {
            setTimeout(done, goblinBase.matchmakingConfig.numericConstants.gameroomBookingTtl);
        });
        it('First player should get timeout after waiting', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: timeout', c: -1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorn1, callbackFn);
        });
        it('Both players should find each other again', done => {
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