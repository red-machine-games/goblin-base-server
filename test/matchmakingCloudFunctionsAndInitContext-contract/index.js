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
describe('The cases', () => {
    const N = 3;

    var cachedDisallowDirectProfileExposure, cachedMatchmakingStrategy;

    var unicorns = [];

    describe('Stuff', () => {
        it('Should do some stuff', () => {
            cachedDisallowDirectProfileExposure = goblinBase.authoritarianConfig.disallowDirectProfileExposure;
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = true;
            cachedMatchmakingStrategy = goblinBase.matchmakingConfig.strategy;
            goblinBase.matchmakingConfig.strategy = 'open';
        });
    });
    describe('Matchmaking functionality', () => {
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
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ disallowDirectProfileExposure: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
            });
        });
        it('Should require cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/matchmakingFunctionality/cloudFunction1.js')
                .requireAsCloudFunction('./cloudFunctions/matchmakingFunctionality/cloudFunction2.js')
                .requireAsCloudFunction('./cloudFunctions/matchmakingFunctionality/cloudFunction3.js')
                ._reinitCloudFunctions(done);
        });
        _(N).times(n => {
            it(`Should call cloudFunction1 for player ${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', {
                    theRating: (n + 1) * 10
                }, unicorns[n], callbackFn);
            });
        });
        it('Should call cloudFunction2 for player 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ hid1: 1, hid2: 3 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorns[1], callbackFn);
        });
        it('Should call cloudFunction3 for player 2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ hid1: 3, hid2: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorns[1], callbackFn);
        });
    });
    describe('Init context functionality', () => {
        describe('Case #1', () => {
            it('Should require cloud functions 1', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case1/initContext1/initContext.js')
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case1/cloudFunction1.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call customFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ abiding: 'discussion', globSize: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[1], callbackFn);
            });
            it('Should require cloud functions 2', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case1/initContext2/initContext.js')
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case1/cloudFunction2.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call customFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ little: 'example', globSize: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorns[0], callbackFn);
            });
        });
        describe.skip('Case #2', () => {
            it('Should require cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case2/initContext.js')
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case2/cloudFunction1.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call customFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ okay1: true, okay2: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
        });
        describe('Case #3', () => {
            it('Should require cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case3/initContext.js')
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case3/cloudFunction1.js')
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case3/cloudFunction2.js')
                    ._reinitCloudFunctions(done);
            });
            _(N).times(n => {
                it(`Should call customFunction1 #${n + 1}`, done => {
                    let callbackFn = (err, response) => {
                        expect(err).to.be.equal(null);
                        expect(response.statusCode).to.equal(200);

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
                });
            });
            it('Should call customFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ theVal: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorns[0], callbackFn);
            });
        });
        describe('Case #4', () => {
            it('Should require cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case4/initContext.js')
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case4/cloudFunction1.js')
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case4/cloudFunction2.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call customFunction1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should call customFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ theVal: 1337 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorns[0], callbackFn);
            });
        });
        describe('Case #5', () => {
            it('Should require cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case5/initContext.js')
                    .requireAsCloudFunction('./cloudFunctions/initContextFunctionality/case5/cloudFunction1.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call customFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ behlance: { bal: { hello: 'world' } } });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
        });
    });
    describe('Trace inside initContext', () => {
        it('Should require cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/initContextTrace/initContext.js')
                .requireAsCloudFunction('./cloudFunctions/initContextTrace/cloudFunction1.js')
                ._reinitCloudFunctions(done);
        });
        it('Should call cloudFunction1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('_traces');
                expect(body._traces.length).to.be.equal(2);
                expect(body._traces[0].endsWith('Hello World 1')).to.be.equal(true);
                expect(body._traces[1].endsWith('Hello World 2')).to.be.equal(true);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
        });
    });
    describe('Stuff', () => {
        it('Should undo some stuff', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = cachedDisallowDirectProfileExposure;
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