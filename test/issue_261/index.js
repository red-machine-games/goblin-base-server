'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    WebSocket = require('ws');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('../utils/testUtils.js');

const START_AT_HOST = require('../!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../!testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do some stuff', () => {
        gameplayRoom = require('../../lib/features/realtimePvp/gameplayRoom.js');
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

    describe('The cases', () => {
        var unicorn, gClientId, gClientSecret;

        describe('Case #1', () => {
            it('Should drop databases', done => {
                async.parallel([
                    cb => testUtils.removeAllDocuments(cb),
                    cb => opClients.getSessionsClient().getRedis().flushall(cb)
                ], done);
            });

            it('Should push createNewProfile and theCloudFunction cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/createNewProfile.js')
                    .requireAsCloudFunction('./cloudFunctions/theCloudFunction.js')
                    ._reinitCloudFunctions(done);
            });
            it(`Should create new account`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = _unicorn;
                    gClientId = body.gClientId;
                    gClientSecret = body.gClientSecret;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it(`Should create new profile`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call theCloudFunction', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ profileData: {
                        museum: ['scratch', 'stress'],
                        budge: { vegetation: [{ content: 'aspect' }, { defendant: 'freeze' }, { indirect: 'default' }] }
                    }});

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.theCloudFunction', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('Case #2', () => {
            it('Should drop databases', done => {
                async.parallel([
                    cb => testUtils.removeAllDocuments(cb),
                    cb => opClients.getSessionsClient().getRedis().flushall(cb)
                ], done);
            });

            it('Should push initContext, createNewProfile and theCloudFunction cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/initContext.js')
                    .requireAsCloudFunction('./cloudFunctions/createNewProfile.js')
                    .requireAsCloudFunction('./cloudFunctions/theCloudFunction.js')
                    ._reinitCloudFunctions(done);
            });
            it(`Should create new account`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = _unicorn;
                    gClientId = body.gClientId;
                    gClientSecret = body.gClientSecret;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it(`Should create new profile`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call theCloudFunction', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ response: [{
                            "name" : "OrderSoldier",
                            "id" : 1
                        },{
                            "name" : "OrderNun",
                            "id" : 18
                        },{
                            "name" : "WaveOfLight",
                            "id" : 10001
                        },{
                            "name" : "SummonArcher",
                            "id" : 10019
                        }]
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.theCloudFunction', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
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