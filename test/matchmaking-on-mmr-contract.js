'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

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
    const N = 6;

    var longPollingColdResponseAfterMsCached, limitLeaderboardRadiusCached,
        unicorns = [];

    describe('Stuff', () => {
        it('Should do some stuff', () => {
            longPollingColdResponseAfterMsCached = goblinBase.matchmakingConfig.longPollingColdResponseAfterMs;
            limitLeaderboardRadiusCached = goblinBase.matchmakingConfig.limitLeaderboardRadius;
            goblinBase.matchmakingConfig.longPollingColdResponseAfterMs = 1000;
            goblinBase.matchmakingConfig.limitLeaderboardRadius = 0;
            goblinBase.matchmakingConfig.limitMmr = 1;
            goblinBase.matchmakingConfig.searchBothSides = false;
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

        _(N).times(n => {
            it(`Should create new account №${n + 1}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorns[n] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it(`Should create new profile №${n + 1}`, done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: n + 1, mmr: 0, ver: 1, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
            });
        });

    });
    describe('Real player search', () => {
        it('Should post a record 3 for player №1', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 3,
                segment: 'segma'
            }, null, unicorns[0], callbackFn);
        });
        it('Should post a record 1 for player №2', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 1,
                segment: 'segma'
            }, null, unicorns[1], callbackFn);
        });
        it('Should post a record 2 for player №3', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 2,
                segment: 'segma'
            }, null, unicorns[2], callbackFn);
        });
        it('Should post a record 3 for player №4', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 3,
                segment: 'segma'
            }, null, unicorns[3], callbackFn);
        });
        it('Should post a record 4 for player №5', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 4,
                segment: 'segma'
            }, null, unicorns[4], callbackFn);
        });
        it('Should post a record 5 for player №6', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 5,
                segment: 'segma'
            }, null, unicorns[5], callbackFn);
        });

        it('Should set MMR for first player', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.updateProfile', null, { mmr: 3 }, unicorns[0], callbackFn);
        });
        it('Should set MMR for player 2', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.updateProfile', null, { mmr: 0 }, unicorns[1], callbackFn);
        });
        it('Should set MMR for player 3', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.updateProfile', null, { mmr: 1 }, unicorns[2], callbackFn);
        });
        it('Should set MMR for player 4', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.updateProfile', null, { mmr: 4 }, unicorns[3], callbackFn);
        });
        it('Should set MMR for player 5', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.updateProfile', null, { mmr: 5 }, unicorns[4], callbackFn);
        });
        it('Should set MMR for player 6', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.updateProfile', null, { mmr: 6 }, unicorns[5], callbackFn);
        });

        it('Player 5 should start searching and after 1 sec player 1 should find him', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player5Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);
                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[4], callbackFn);

                setTimeout(player1Search, 1000);
            }
            function player1Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], callbackFn);
            }

            player5Search();
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });
        it('Player 4 should start searching and after 1 sec player 1 should find him', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player4Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);
                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[3], callbackFn);

                setTimeout(player1Search, 1000);
            }
            function player1Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], callbackFn);
            }

            player4Search();
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });


        it('Players 1 and 3 should NOT find each other', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[2], cb)
            ], callbackFn);
        });
        it('Players 1 and 3 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[2], cb)
            ], callbackFn);
        });
        it('Players 1 and 6 should NOT find each other', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[5], cb)
            ], callbackFn);
        });
        it('Players 1 and 6 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[5], cb)
            ], callbackFn);
        });

        // ############################################################################
        // ############################################################################
        // ############################################################################

        it('Should set MMR for first player', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.updateProfile', null, { mmr: 4 }, unicorns[0], callbackFn);
        });

        it('Player 6 should start searching and after 1 sec player 1 should find him', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player6Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);
                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[5], callbackFn);

                setTimeout(player1Search, 1000);
            }
            function player1Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], callbackFn);
            }

            player6Search();
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });
        it('Player 5 should start searching and after 1 sec player 1 should find him', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player5Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);
                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[4], callbackFn);

                setTimeout(player1Search, 1000);
            }
            function player1Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], callbackFn);
            }

            player5Search();
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });

        it('Players 1 and 3 should NOT find each other', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[2], cb)
            ], callbackFn);
        });
        it('Players 1 and 3 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[2], cb)
            ], callbackFn);
        });
        it('Players 1 and 4 should NOT find each other', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[3], cb)
            ], callbackFn);
        });
        it('Players 1 and 4 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[3], cb)
            ], callbackFn);
        });

        // ############################################################################
        // ############################################################################
        // ############################################################################

        it('Should set MMR for first player', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.updateProfile', null, { mmr: 2 }, unicorns[0], callbackFn);
        });

        it('Player 3 should start searching and after 1 sec player 1 should find him', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player3Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);
                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[2], callbackFn);

                setTimeout(player1Search, 1000);
            }
            function player1Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], callbackFn);
            }

            player3Search();
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });

        it('Players 1 and 2 should NOT find each other', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[1], cb)
            ], callbackFn);
        });
        it('Players 1 and 2 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[1], cb)
            ], callbackFn);
        });
        it('Players 1 and 4 should NOT find each other', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[3], cb)
            ], callbackFn);
        });
        it('Players 1 and 4 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[3], cb)
            ], callbackFn);
        });
        it('Players 1 and 5 should NOT find each other', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[4], cb)
            ], callbackFn);
        });
        it('Players 1 and 5 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[4], cb)
            ], callbackFn);
        });

        // ############################################################################
        // ############################################################################
        // ############################################################################

        it('Should set MMR for first player', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.updateProfile', null, { mmr: 1 }, unicorns[0], callbackFn);
        });

        it('Player 2 should start searching and after 1 sec player 1 should find him', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player2Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);
                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[1], callbackFn);

                setTimeout(player1Search, 1000);
            }
            function player1Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], callbackFn);
            }

            player2Search();
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });

        it('Players 1 and 3 should NOT find each other', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[2], cb)
            ], callbackFn);
        });
        it('Players 1 and 3 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[2], cb)
            ], callbackFn);
        });
        it('Players 1 and 4 should NOT find each other', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[3], cb)
            ], callbackFn);
        });
        it('Players 1 and 4 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[3], cb)
            ], callbackFn);
        });
        it('Players 1 and 5 should NOT find each other', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma' }, null, unicorns[4], cb)
            ], callbackFn);
        });
        it('Players 1 and 5 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[4], cb)
            ], callbackFn);
        });
    });
    describe('More stuff', () => {
        it('Should undo some stuff', () => {
            goblinBase.matchmakingConfig.longPollingColdResponseAfterMs = longPollingColdResponseAfterMsCached;
            goblinBase.matchmakingConfig.limitLeaderboardRadius = limitLeaderboardRadiusCached;
            goblinBase.matchmakingConfig.searchBothSides = true;
            goblinBase.matchmakingConfig.limitMmr = 0;
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