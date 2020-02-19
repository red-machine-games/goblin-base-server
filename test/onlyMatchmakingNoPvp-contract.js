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
    const N = 9;

    var unicorns = [];

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
            it(`Should set player public profile data #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'profile.setProfile', null, {
                    publicProfileData: { thisPlayerNum: n }
                }, unicorns[n], callbackFn);
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
        it('Player 1 should find player 9 with [1;+inf)', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 8 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: 1, to: '+inf' }] }, unicorns[0], callbackFn);
        });
        it('Player 1 should find nothing with [1;+inf)', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(404);

                expect(body).to.be.deep.equal(new ErrorResponse(853, 'No opponent'));

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: 1, to: '+inf' }] }, unicorns[0], callbackFn);
        });
        it('Player 1 should find player 2 with (-inf;+inf)', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 1 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: '-inf', to: '+inf' }] }, unicorns[0], callbackFn);
        });
        it('Player 1 should find nothing with [9;9]', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(404);

                expect(body).to.be.deep.equal(new ErrorResponse(853, 'No opponent'));

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: 9, to: 9 }] }, unicorns[0], callbackFn);
        });
        it('Player 1 should find player 9 with (+inf;-inf)', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 8 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: '+inf', to: '-inf' }] }, unicorns[0], callbackFn);
        });
        it('Player 1 should find player 8 with [1;2],[3;4]', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 7 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: 1, to: 2 }, { from: 3, to: 4 }] }, unicorns[0], callbackFn);
        });
        it('Player 1 should find player 7 with [3;4],[5;6]', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 6 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: 3, to: 4 }, { from: 5, to: 6 }] }, unicorns[0], callbackFn);
        });
        it('Player 1 should find player 6 with [3;4],[5;6]', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 5 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: 3, to: 4 }, { from: 5, to: 6 }] }, unicorns[0], callbackFn);
        });
        it('Player 1 should find player 5 with [5;6],[7;7]', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 4 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: 5, to: 6 }, { from: 7, to: 7 }] }, unicorns[0], callbackFn);
        });
        it('Player 1 should find player 3 with [7;7]', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 2 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: 7, to: 7 }] }, unicorns[0], callbackFn);
        });
        it('Player 1 should find nothing with [7;7]', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(404);

                expect(body).to.be.deep.equal(new ErrorResponse(853, 'No opponent'));

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: 7, to: 7 }] }, unicorns[0], callbackFn);
        });
        it('Player 1 should find somebody with (-inf;+inf) and nram=5', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('publicProfileData');

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'bylad'
            }, { rgs: [{ from: '-inf', to: '+inf' }], nram: 5 }, unicorns[0], callbackFn);
        });
    });
    describe('Case #2 - by rating', () => {
        it('Player 4 should find player 6 with [60;+inf),(59;-inf]', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 5 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'byr'
            }, { rgs: [{ from: 60, to: '+inf' }, { from: 59, to: '-inf' }] }, unicorns[3], callbackFn);
        });
        it('Player 4 should find player 7 with [60;+inf),(59;-inf]', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 6 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'byr'
            }, { rgs: [{ from: 60, to: '+inf' }, { from: 59, to: '-inf' }] }, unicorns[3], callbackFn);
        });
        it('Player 4 should find player 5 with (59;-inf],[60;+inf)', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 4 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'byr'
            }, { rgs: [{ from: 59, to: '-inf' }, { from: 60, to: '+inf' }] }, unicorns[3], callbackFn);
        });
        it('Player 4 should find player 3 with (59;-inf],[60;+inf)', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId');
                delete body.humanId;
                expect(body).to.be.deep.equal({ publicProfileData: { thisPlayerNum: 2 }, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'byr'
            }, { rgs: [{ from: 59, to: '-inf' }, { from: 60, to: '+inf' }] }, unicorns[3], callbackFn);
        });
        it('Player 4 should find somebody with (+inf;-inf) and nram=5', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('publicProfileData');

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'byr'
            }, { rgs: [{ from: '+inf', to: '-inf' }], nram: 5 }, unicorns[3], callbackFn);
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