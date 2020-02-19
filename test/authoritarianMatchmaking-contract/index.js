'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    testUtils = require('../utils/testUtils.js');

const START_AT_HOST = require('../!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../!testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    var cachedDisallowDirectPvpMatchmakingExposure, cachedMatchmakingStrategy;

    describe('Stuff', () => {
        it('Should do some stuff', () => {
            cachedDisallowDirectPvpMatchmakingExposure = goblinBase.authoritarianConfig.disallowDirectPvpMatchmakingExposure;
            goblinBase.authoritarianConfig.disallowDirectPvpMatchmakingExposure = true;
            cachedMatchmakingStrategy = goblinBase.matchmakingConfig.strategy;
            goblinBase.matchmakingConfig.strategy = 'open';
        });
    });

    var unicorns = [];

    describe('The case', () => {
        const N = 3;

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
        });
        it('Should require cloud function', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/onMatchmaking.js')
                ._reinitCloudFunctions(done);
        });
        _(N).times(n => {
            it(`Should post record in segment segma for player #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                    value: n + 1,
                    segment: 'segma'
                }, null, unicorns[n], callbackFn);
            });
        });
        it('Second player should matchmake forward and find third one', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ humanId: 3, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'byr'
            }, { whereToSearch: 'forward' }, unicorns[1], callbackFn);
        });
        it('Second player should matchmake backward and find first one', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ humanId: 1, ver: 1 });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'mm.matchPlayer', {
                segment: 'segma',
                strat: 'byr'
            }, { whereToSearch: 'backward pls' }, unicorns[1], callbackFn);
        });
    });

    describe('Stuff', () => {
        it('Should undo some stuff', () => {
            goblinBase.authoritarianConfig.disallowDirectPvpMatchmakingExposure = cachedDisallowDirectPvpMatchmakingExposure;
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