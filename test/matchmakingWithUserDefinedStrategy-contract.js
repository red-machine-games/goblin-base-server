'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

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
    const N = 9;

    var cachedMatchmakingStrategy;

    describe('The stuff', () => {
        it('Should do some stuff', () => {
            cachedMatchmakingStrategy = goblinBase.matchmakingConfig.strategy;
            goblinBase.matchmakingConfig.strategy = 'open';
        });
    });
    describe('Case #1 - by ladder', () => {
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

        var unicorns = [];

        _(N).times(n => {
            it(`Should create new account #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorns[n] = _unicorn;

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
            it(`Should post player rating #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: (n + 1) * 10,
                    segment: 'segma'
                }, null, unicorns[n], callbackFn);
            });
        });
        it('Player 1 search(first) with [9,+inf) for player 9 with (-inf,1]', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player1Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);
                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: 9, to: '+inf' }] }, unicorns[0], callbackFn);

                setTimeout(player9Search, 1000);
            }
            function player9Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '-inf', to: 1 }] }, unicorns[8], callbackFn);
            }

            player1Search();
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });
        it('Player 1 and 9 should find each other with -inf,+inf', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '-inf', to: '+inf' }] }, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '+inf', to: '-inf' }] }, unicorns[8], cb)
            ], callbackFn);
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });
        it('Player 1 search with [9,+inf) for player 9(first) with (-inf,1]', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player1Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);
                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: 9, to: '+inf' }] }, unicorns[0], callbackFn);
            }
            function player9Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '-inf', to: 1 }] }, unicorns[8], callbackFn);

                setTimeout(player1Search, 1000);
            }

            player9Search();
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });
        it('Player 1 and 2 should try to find each other with (-inf,-inf)', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '-inf', to: '-inf' }] }, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '-inf', to: '-inf' }] }, unicorns[1], cb)
            ], callbackFn);
        });
        it('Player 1 and 2 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({ stat: 'MM: no more waiting', c: -1 });

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[1], cb)
            ], callbackFn);
        });
        it('Player 1 and 2 should try to find each other with (+inf,+inf)', done => {
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
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '+inf', to: '+inf' }] }, unicorns[0], cb),
                cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '+inf', to: '+inf' }] }, unicorns[1], cb)
            ], callbackFn);
        });
        it('Player 1 and 2 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({ stat: 'MM: no more waiting', c: -1 });

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[1], cb)
            ], callbackFn);
        });
        it('Player 1 search with [1;2],[3;4],[5;6],[7;7] for player 9(first) with (+inf,-inf)', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player1Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: 1, to: 2 }, { from: 3, to: 4 }, { from: 5, to: 6 }, { from: 7, to: 7 }] }, unicorns[0], callbackFn);
            }
            function player9Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '-inf', to: '+inf' }] }, unicorns[8], callbackFn);

                setTimeout(player1Search, 1000);
            }

            player9Search();
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });
        it('Player 1 search with [1;2],[3;4],[5;6],[7;7] for player 6(first) with (+inf,-inf)', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player1Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: 1, to: 2 }, { from: 3, to: 4 }, { from: 5, to: 6 }, { from: 7, to: 7 }] }, unicorns[0], callbackFn);
            }
            function player6Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '-inf', to: '+inf' }] }, unicorns[5], callbackFn);

                setTimeout(player1Search, 1000);
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
        it('Player 1 search with [1;2],[3;4],[5;6],[7;7] for player 4(first) with (+inf,-inf)', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player1Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: 1, to: 2 }, { from: 3, to: 4 }, { from: 5, to: 6 }, { from: 7, to: 7 }] }, unicorns[0], callbackFn);
            }
            function player4Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '-inf', to: '+inf' }] }, unicorns[3], callbackFn);

                setTimeout(player1Search, 1000);
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
        it('Player 1 search with [1;2],[3;4],[5;6],[7;7] for player 3(first) with (+inf,-inf)', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player1Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: 1, to: 2 }, { from: 3, to: 4 }, { from: 5, to: 6 }, { from: 7, to: 7 }] }, unicorns[0], callbackFn);
            }
            function player3Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '-inf', to: '+inf' }] }, unicorns[2], callbackFn);

                setTimeout(player1Search, 1000);
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
        it('Player 1 should try to search with [1;2],[3;4],[5;6],[7;7] for player 2(first) with (+inf,-inf)', done => {
            var delayOkay = false, firstOkay = false, secondOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay){
                    done();
                }
            }

            function player1Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(delayOkay).to.be.equal(true);

                    expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: 1, to: 2 }, { from: 3, to: 4 }, { from: 5, to: 6 }, { from: 7, to: 7 }] }, unicorns[0], callbackFn);
            }
            function player2Search(){
                delayOkay = true;

                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'bylad'
                }, { rgs: [{ from: '-inf', to: '+inf' }] }, unicorns[1], callbackFn);

                setTimeout(player1Search, 1000);
            }

            player2Search();
        });
        it('Player 1 and 2 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');
                expect(responses[0][0].statusCode).to.be.equal(200);
                expect(responses[1][0].statusCode).to.be.equal(200);

                var body1 = responses[0][1],
                    body2 = responses[1][1];

                expect(body1).to.deep.equal(body2);
                expect(body2).to.deep.equal({ stat: 'MM: no more waiting', c: -1 });

                done();
            };

            async.parallel([
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[0], cb),
                cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[1], cb)
            ], callbackFn);
        });
    });
    describe('Case #2 - by rating', () => {
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

        var unicorns = [];

        _(N).times(n => {
            it(`Should create new account #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorns[n] = _unicorn;

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
            it(`Should post player rating #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: (n + 1) * 10,
                    segment: 'segma'
                }, null, unicorns[n], callbackFn);
            });
        });
        it('Player 4 should search with (-inf;-inf), player 6 should search with (+inf;+inf) and player 5 should search with [60;+inf),(59;-inf]', done => {
            var firstOkay = false, secondOkay = false, thirdOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay && thirdOkay){
                    done();
                }
            }

            function player4Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'byr'
                }, { rgs: [{ from: '-inf', to: '-inf' }] }, unicorns[3], callbackFn);
            }
            function player6Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'byr'
                }, { rgs: [{ from: '+inf', to: '+inf' }] }, unicorns[5], callbackFn);
            }
            function player5Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    thirdOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'byr'
                }, { rgs: [{ from: 60, to: '+inf' }, { from: 59, to: '-inf' }] }, unicorns[4], callbackFn);
            }

            player4Search();
            player6Search();
            setTimeout(player5Search, 1000);
        });
        it('Player 4 should stop searching', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: no more waiting', c: -1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[3], callbackFn);
        });
        it('Player 6 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[5], callbackFn);
        });
        it('Player 4 should search with (-inf;-inf), player 6 should search with (+inf;+inf) and player 5 should search with (59;-inf],[60;+inf)', done => {
            var firstOkay = false, secondOkay = false, thirdOkay = false;

            function doneCallback(){
                if(firstOkay && secondOkay && thirdOkay){
                    done();
                }
            }

            function player4Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    firstOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'byr'
                }, { rgs: [{ from: '-inf', to: '-inf' }] }, unicorns[3], callbackFn);
            }
            function player6Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });

                    secondOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'byr'
                }, { rgs: [{ from: '+inf', to: '+inf' }] }, unicorns[5], callbackFn);
            }
            function player5Search(){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });

                    thirdOkay = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'byr'
                }, { rgs: [{ from: 59, to: '-inf' }, { from: 60, to: '+inf' }] }, unicorns[4], callbackFn);
            }

            player4Search();
            player6Search();
            setTimeout(player5Search, 1000);
        });
        it('Player 6 should stop searching', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.a('null');
                expect(response.statusCode).to.be.equal(200);

                expect(body).to.deep.equal({ stat: 'MM: no more waiting', c: -1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[5], callbackFn);
        });
        it('Player 4 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[3], callbackFn);
        });
        it('Player 2-9 should search with [0;0], player 1 should search with (-inf;+inf)', done => {
            var okays = [];

            function doneCallback(){
                if(okays.filter(e => !!e).length === N){
                    done();
                }
            }

            function playerSearch(playerN, body){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    if(playerN === 0 || playerN === 1){
                        expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });
                    } else {
                        expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });
                    }

                    okays[playerN] = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'byr'
                }, body, unicorns[playerN], callbackFn);
            }

            _(N - 1).times(n => playerSearch(n + 1, { rgs: [{ from: 0, to: 0 }] }));

            setTimeout(() => playerSearch(0, { rgs: [{ from: '-inf', to: '+inf' }] }), 1000);
        });
        it('Players 3-9 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');

                for(let i = 0 ; i < 6 ; i++){
                    expect(responses[i][0].statusCode).to.be.equal(200);
                    expect(responses[i][0].statusCode).to.be.equal(200);

                    let body = responses[i][1];

                    expect(body).to.deep.equal({ stat: 'MM: no more waiting', c: -1 });
                }

                done();
            };

            var asyncJobs = [];
            _(6).times(n => {
                n += 2;
                asyncJobs.push(cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[n], cb));
            });
            async.parallel(asyncJobs, callbackFn);
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });
        it('Player 2-9 should search with [0;0], player 1 should search with (+inf;-inf)', done => {
            var okays = [];

            function doneCallback(){
                if(okays.filter(e => !!e).length === N){
                    done();
                }
            }

            function playerSearch(playerN, body){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    if(playerN === 0 || playerN === 8){
                        expect(body).to.deep.equal({ stat: 'MM: accept or decline the game', c: 1 });
                    } else {
                        expect(body).to.deep.equal({ stat: 'MM: searching', c: 0 });
                    }

                    okays[playerN] = true;
                    doneCallback();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', {
                    segment: 'segma',
                    strat: 'byr'
                }, body, unicorns[playerN], callbackFn);
            }

            _(N - 1).times(n => playerSearch(n + 1, { rgs: [{ from: 0, to: 0 }] }));

            setTimeout(() => playerSearch(0, { rgs: [{ from: '+inf', to: '-inf' }] }), 1000);
        });
        it('Players 2-8 should stop searching', done => {
            let callbackFn = (err, responses) => {
                expect(err).to.be.a('null');

                for(let i = 0 ; i < 6 ; i++){
                    expect(responses[i][0].statusCode).to.be.equal(200);
                    expect(responses[i][0].statusCode).to.be.equal(200);

                    let body = responses[i][1];

                    expect(body).to.deep.equal({ stat: 'MM: no more waiting', c: -1 });
                }

                done();
            };

            var asyncJobs = [];
            _(6).times(n => {
                n += 1;
                asyncJobs.push(cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.stopSearchingForOpponent', null, unicorns[n], cb));
            });
            async.parallel(asyncJobs, callbackFn);
        });
        it('Player 1 should decline match', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.declineMatch', null, unicorns[0], callbackFn);
        });
    });
    describe('The stuff', () => {
        it('Should undo some stuff', () => {
            goblinBase.matchmakingConfig.strategy = cachedMatchmakingStrategy;
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