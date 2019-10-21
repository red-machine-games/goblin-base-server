'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    testUtils = require('../utils/testUtils.js');

var Profile = require('../../lib/persistenceSubsystem/dao/profile.js'),
    PveBattle = require('../../lib/persistenceSubsystem/dao/pveBattle.js'),
    Receipt = require('../../lib/persistenceSubsystem/dao/receipt.js');

const START_AT_HOST = require('../testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../testEntryPoint.js').START_AT_PORT;

var ErrorResponse = require('../../lib/objects/ErrorResponse.js');

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The cases', () => {
    const _PLATFORM_VERSION = 'android;0.0.0',
        N = 3;

    var unicorns = [], gClientIds = [], gClientSecrets = [];

    describe('Adding the players', () => {
        _(N).times(n => {
            it(`Should create new account #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorns.push(_unicorn);
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

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
    });

    describe('Case with modifying 3 profiles', () => {
        var someCounter = 0;

        describe('The case with global.GFeSgp5g === true (no changes)', () => {
            it('Should push cloudFunction1', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction1.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction1 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction1' }));

                    delete global.GFeSgp5g;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction1 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction1' }));

                    delete global.GFeSgp5g;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction1 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction1' }));

                    delete global.GFeSgp5g;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
        describe('The case with global.wRgvM8Ea === true', () => {
            it('Should call cloudFunction1 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction1' }));

                    delete global.wRgvM8Ea;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction1 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction1' }));

                    delete global.wRgvM8Ea;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction1 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction1' }));

                    delete global.wRgvM8Ea;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
        });
        describe('The case with global.M8x8CUgY === true', () => {
            it('Should call cloudFunction1 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'M8x8CUgY', { cfName: 'cloudFunction1' }));

                    delete global.M8x8CUgY;

                    done();
                };

                global.M8x8CUgY = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should call cloudFunction1 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'M8x8CUgY', { cfName: 'cloudFunction1' }));

                    delete global.M8x8CUgY;

                    done();
                };

                global.M8x8CUgY = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction1 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'M8x8CUgY', { cfName: 'cloudFunction1' }));

                    delete global.M8x8CUgY;

                    done();
                };

                global.M8x8CUgY = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
        describe('The case with global.fV36sWdU === true', () => {
            it('Should call cloudFunction1 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.fV36sWdU;

                    done();
                };

                global.fV36sWdU = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should call cloudFunction1 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.fV36sWdU;

                    done();
                };

                global.fV36sWdU = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction1 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.fV36sWdU;

                    done();
                };

                global.fV36sWdU = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
        describe('The case with global.GXJ2vPMm === true', () => {
            it('Should call cloudFunction1 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.GXJ2vPMm;

                    done();
                };

                global.GXJ2vPMm = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should call cloudFunction1 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.GXJ2vPMm;

                    done();
                };

                global.GXJ2vPMm = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction1 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.GXJ2vPMm;

                    done();
                };

                global.GXJ2vPMm = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
        describe('The case with global.znMdj4Hb === true', () => {
            it('Should call cloudFunction1 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'znMdj4Hb', { cfName: 'cloudFunction1' }));

                    delete global.znMdj4Hb;

                    done();
                };

                global.znMdj4Hb = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should call cloudFunction1 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'znMdj4Hb', { cfName: 'cloudFunction1' }));

                    delete global.znMdj4Hb;

                    done();
                };

                global.znMdj4Hb = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction1 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'znMdj4Hb', { cfName: 'cloudFunction1' }));

                    delete global.znMdj4Hb;

                    done();
                };

                global.znMdj4Hb = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: ++someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: { world: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
        describe('Clear up profiles', () => {
            it('Should push clearupCloudFunction1', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/clearupCloudFunction1.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call clearupCloudFunction1 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ okay: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.clearupCloudFunction1', null, unicorns[0], callbackFn);
            });
        });
    });
    describe('Case with modifying and getting others\' profiles', () => {
        var someCounter = 0;

        describe('The case with global.GFeSgp5g === true (no changes)', () => {
            it('Should push cloudFunction3 and cloudFunction4 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction3.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction4.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction3 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction3' }));

                    delete global.GFeSgp5g;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction4 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ theNodeOf2: null });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
        });
        describe('The case with global.wRgvM8Ea === true', () => {
            it('Should call cloudFunction3 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction3' }));

                    delete global.wRgvM8Ea;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player directly from DB', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.equal(null);

                    expect(doc).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                Profile.findOne(
                    { humanId: 2 },
                    { projection: { _id: 0, humanId: 1, ver: 1, mmr: 1, wlRate: 1, profileData: 1, publicProfileData: 1 } },
                    callbackFn
                );
            });
            it('Should get profile for third player directly from DB', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.equal(null);

                    expect(doc).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                Profile.findOne(
                    { humanId: 3 },
                    { projection: { _id: 0, humanId: 1, ver: 1, mmr: 1, wlRate: 1, profileData: 1, publicProfileData: 1 } },
                    callbackFn
                );
            });
            it('Should call cloudFunction4 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ theNodeOf2: ++someCounter });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { complete: { asylum: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { summit: { fat: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
        });
        describe('The case with global.M8x8CUgY === true', () => {
            it('Should call cloudFunction3 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'M8x8CUgY', { cfName: 'cloudFunction3' }));

                    delete global.M8x8CUgY;

                    done();
                };

                global.M8x8CUgY = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction4 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ theNodeOf2: ++someCounter });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { complete: { asylum: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { summit: { fat: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
        });
        describe('The case with global.fV36sWdU === true', () => {
            it('Should call cloudFunction3 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.fV36sWdU;

                    done();
                };

                global.fV36sWdU = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction4 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ theNodeOf2: ++someCounter });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { complete: { asylum: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { summit: { fat: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
        });
        describe('The case with global.GXJ2vPMm === true', () => {
            it('Should call cloudFunction3 by first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.GXJ2vPMm;

                    done();
                };

                global.GXJ2vPMm = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction4 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ theNodeOf2: ++someCounter });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { complete: { asylum: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { summit: { fat: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
        });
        describe('The case with global.znMdj4Hb === true', () => {
            it('Should call cloudFunction3 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'znMdj4Hb', { cfName: 'cloudFunction3' }));

                    delete global.znMdj4Hb;

                    done();
                };

                global.znMdj4Hb = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction4 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ theNodeOf2: ++someCounter });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { complete: { asylum: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { summit: { fat: someCounter } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
        });
    });
    describe('Case with modifying and getting others\' records', () => {
        var someCounter = 0;

        describe('The case with global.GFeSgp5g === true (no changes)', () => {
            it('Should push cloudFunction5, cloudFunction6, cloudFunction7 and cloudFunction8 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction5.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction6.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction7.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction8.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction5 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction5' }));

                    delete global.GFeSgp5g;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction6 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec2: null });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorns[0], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[1], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[2], callbackFn);
            });
        });
        describe('The case with global.wRgvM8Ea === true', () => {
            it('Should call cloudFunction5 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction5' }));

                    delete global.wRgvM8Ea;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction6 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec2: ++someCounter });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorns[0], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[2], callbackFn);
            });
        });
        describe('The case with global.UTgyacGT === true', () => {
            it('Should call cloudFunction5 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'UTgyacGT', { cfName: 'cloudFunction5' }));

                    delete global.UTgyacGT;

                    done();
                };

                global.UTgyacGT = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction6 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec2: ++someCounter });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorns[0], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[2], callbackFn);
            });
        });
        describe('The case with global.K6RYs9tS === true', () => {
            it('Should call cloudFunction7 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'K6RYs9tS', { cfName: 'cloudFunction7' }));

                    delete global.K6RYs9tS;

                    done();
                };

                global.K6RYs9tS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction7', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction8 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec2: 13 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction8', null, unicorns[0], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorns[2], callbackFn);
            });
        });
        describe('The case with global.GZA9FcbS === true', () => {
            it('Should call cloudFunction5 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GZA9FcbS', { cfName: 'cloudFunction5' }));

                    delete global.GZA9FcbS;

                    done();
                };

                global.GZA9FcbS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction6 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec2: ++someCounter });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorns[0], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: someCounter, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[2], callbackFn);
            });
        });
        describe('The case with global.brjBQgdR === true', () => {
            it('Should call cloudFunction5 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.brjBQgdR;

                    done();
                };

                global.brjBQgdR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction6 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec2: ++someCounter });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorns[0], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: someCounter, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[2], callbackFn);
            });
        });
        describe('The case with global.FtFMwUuS === true', () => {
            it('Should call cloudFunction5 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.FtFMwUuS;

                    done();
                };

                global.FtFMwUuS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction6 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec2: ++someCounter });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorns[0], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: someCounter, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[2], callbackFn);
            });
        });
    });
    describe('Case with modifying 3 records', () => {
        var someCounter = 0;

        describe('The case with global.GFeSgp5g === true (no changes)', () => {
            it('Should push cloudFunction9 and cloudFunction10 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction9.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction10.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction9 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction9' }));

                    delete global.GFeSgp5g;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get rating of first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction9 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction9' }));

                    delete global.GFeSgp5g;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction9 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction9' }));

                    delete global.GFeSgp5g;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
        describe('The case with global.wRgvM8Ea === true', () => {
            it('Should call cloudFunction9 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction9' }));

                    delete global.wRgvM8Ea;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get rating of first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should call cloudFunction9 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction9' }));

                    delete global.wRgvM8Ea;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction9 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction9' }));

                    delete global.wRgvM8Ea;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[2], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
        describe('The case with global.UTgyacGT === true', () => {
            it('Should call cloudFunction9 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'UTgyacGT', { cfName: 'cloudFunction9' }));

                    delete global.UTgyacGT;

                    done();
                };

                global.UTgyacGT = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get rating of first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should call cloudFunction9 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'UTgyacGT', { cfName: 'cloudFunction9' }));

                    delete global.UTgyacGT;

                    done();
                };

                global.UTgyacGT = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction9 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'UTgyacGT', { cfName: 'cloudFunction9' }));

                    delete global.UTgyacGT;

                    done();
                };

                global.UTgyacGT = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[2], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
        describe('The case with global.K6RYs9tS === true', () => {
            it('Should call cloudFunction10 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'K6RYs9tS', { cfName: 'cloudFunction10' }));

                    delete global.K6RYs9tS;

                    done();
                };

                global.K6RYs9tS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction10', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get rating of first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 1337, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should call cloudFunction10 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.K6RYs9tS;

                    done();
                };

                global.K6RYs9tS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction10', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 1337, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction10 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.K6RYs9tS;

                    done();
                };

                global.K6RYs9tS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction10', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 1337, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorns[2], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
        describe('The case with global.GZA9FcbS === true', () => {
            it('Should call cloudFunction9 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GZA9FcbS', { cfName: 'cloudFunction9' }));

                    delete global.GZA9FcbS;

                    done();
                };

                global.GZA9FcbS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get rating of first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 3 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should call cloudFunction9 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GZA9FcbS', { cfName: 'cloudFunction9' }));

                    delete global.GZA9FcbS;

                    done();
                };

                global.GZA9FcbS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction9 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GZA9FcbS', { cfName: 'cloudFunction9' }));

                    delete global.GZA9FcbS;

                    done();
                };

                global.GZA9FcbS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[2], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
        describe('The case with global.brjBQgdR === true', () => {
            it('Should call cloudFunction9 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.brjBQgdR;

                    done();
                };

                global.brjBQgdR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get rating of first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 3 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should call cloudFunction9 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.brjBQgdR;

                    done();
                };

                global.brjBQgdR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction9 again again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.brjBQgdR;

                    done();
                };

                global.brjBQgdR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[2], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
        describe('The case with global.FtFMwUuS === true', () => {
            it('Should call cloudFunction9 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.FtFMwUuS;

                    done();
                };

                global.FtFMwUuS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should get rating of first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 3 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should call cloudFunction9 again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.FtFMwUuS;

                    done();
                };

                global.FtFMwUuS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get rating of second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[1], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
            it('Should call cloudFunction9 again again', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.FtFMwUuS;

                    done();
                };

                global.FtFMwUuS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn);
            });
            it('Should get profile for third player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
            });
            it('Should get rating of third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: ++someCounter, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[2], callbackFn);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
            });
        });
    });

    var cacheMobileReceiptValidationImitate;

    describe('IAP stuff', () => {
        it('Should do some stuff', () => {
            cacheMobileReceiptValidationImitate = goblinBase.mobileReceiptValidationConfig.imitate;
            goblinBase.mobileReceiptValidationConfig.imitate = { isValid: true };
        });
    });

    describe('Case with multiple something per user', () => {
        describe('Reget unicorns', () => {
            _(N).times(n => {
                it(`Should get account for player #${n + 1}`, done => {
                    let callbackFn = (err, response, body) => {
                        expect(err).to.be.equal(null);
                        expect(response.statusCode).to.equal(200);

                        expect(body).to.have.property('unicorn');
                        expect(body.gClientId).to.be.equal(gClientIds[n]);
                        expect(body.gClientSecret).to.be.equal(gClientSecrets[n]);

                        unicorns[n] = body.unicorn;

                        done();
                    };

                    testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                        gclientid: gClientIds[n],
                        gclientsecret: gClientSecrets[n]
                    }, null, null, callbackFn, _PLATFORM_VERSION);
                });
                it(`Should get profile for player #${n + 1}`, done => {
                    let callbackFn = (err, response) => {
                        expect(err).to.be.equal(null);
                        expect(response.statusCode).to.equal(200);

                        done();
                    };

                    testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[n], callbackFn, _PLATFORM_VERSION);
                });
            });
        });
        describe('The case with global.GFeSgp5g === true (no changes)', () => {
            it('Should push cloudFunction11 and cloudFunction12 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction11.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction12.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction11 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction11' }));

                    delete global.GFeSgp5g;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction11', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction12 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        validation1: { isValid: true, butDuplicated: false },
                        validation2: { isValid: true, butDuplicated: false }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction12', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(0);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(0);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should clear receipts and battles by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                async.parallel([
                    cb => PveBattle.deleteMany({}, cb),
                    cb => Receipt.deleteMany({}, cb)
                ], callbackFn);
            });
        });
        describe('The case with global.bc3RdqxT === true', () => {
            it('Should call cloudFunction11 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'bc3RdqxT', { cfName: 'cloudFunction11' }));

                    delete global.bc3RdqxT;

                    done();
                };

                global.bc3RdqxT = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction11', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction12 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        validation1: { isValid: true, butDuplicated: true },
                        validation2: { isValid: true, butDuplicated: true }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction12', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ banner: 'monopoly' });
                    expect(body.l[1].dsp).to.deep.equal({ tract: 'compose' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ example: 'unfortunate' });
                    expect(body.l[1].dsp).to.deep.equal({ rubbish: 'cave' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should clear receipts and battles by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                async.parallel([
                    cb => PveBattle.deleteMany({}, cb),
                    cb => Receipt.deleteMany({}, cb)
                ], callbackFn);
            });
        });
        describe('The case with global.XJPQYMEN === true', () => {
            it('Should call cloudFunction11 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'XJPQYMEN', { cfName: 'cloudFunction11' }));

                    delete global.XJPQYMEN;

                    done();
                };

                global.XJPQYMEN = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction11', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction12 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        validation1: { isValid: true, butDuplicated: true },
                        validation2: { isValid: true, butDuplicated: true }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction12', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ banner: 'monopoly' });
                    expect(body.l[1].dsp).to.deep.equal({ tract: 'compose' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ example: 'unfortunate' });
                    expect(body.l[1].dsp).to.deep.equal({ rubbish: 'cave' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should clear receipts and battles by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                async.parallel([
                    cb => PveBattle.deleteMany({}, cb),
                    cb => Receipt.deleteMany({}, cb)
                ], callbackFn);
            });
        });
        describe('The case with global.abAxXWDG === true', () => {
            it('Should call cloudFunction11 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'abAxXWDG', { cfName: 'cloudFunction11' }));

                    delete global.abAxXWDG;

                    done();
                };

                global.abAxXWDG = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction11', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction12 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        validation1: { isValid: true, butDuplicated: true },
                        validation2: { isValid: true, butDuplicated: true }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction12', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ banner: 'monopoly' });
                    expect(body.l[1].dsp).to.deep.equal({ tract: 'compose' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ example: 'unfortunate' });
                    expect(body.l[1].dsp).to.deep.equal({ rubbish: 'cave' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should clear receipts and battles by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                async.parallel([
                    cb => PveBattle.deleteMany({}, cb),
                    cb => Receipt.deleteMany({}, cb)
                ], callbackFn);
            });
        });
        describe('The case with global.nkZv3JjM === true', () => {
            it('Should call cloudFunction11 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete global.nkZv3JjM;

                    done();
                };

                global.nkZv3JjM = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction11', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction12 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        validation1: { isValid: true, butDuplicated: true },
                        validation2: { isValid: true, butDuplicated: true }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction12', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ banner: 'monopoly' });
                    expect(body.l[1].dsp).to.deep.equal({ tract: 'compose' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ example: 'unfortunate' });
                    expect(body.l[1].dsp).to.deep.equal({ rubbish: 'cave' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should clear receipts and battles by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                async.parallel([
                    cb => PveBattle.deleteMany({}, cb),
                    cb => Receipt.deleteMany({}, cb)
                ], callbackFn);
            });
        });
        describe('The case with global.znMdj4Hb === true', () => {
            it('Should call cloudFunction11 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'znMdj4Hb', { cfName: 'cloudFunction11' }));

                    delete global.znMdj4Hb;

                    done();
                };

                global.znMdj4Hb = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction11', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account for first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body.gClientId).to.be.equal(gClientIds[0]);
                    expect(body.gClientSecret).to.be.equal(gClientSecrets[0]);

                    unicorns[0] = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[0],
                    gclientsecret: gClientSecrets[0]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for first player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for second player', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction12 by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        validation1: { isValid: true, butDuplicated: true },
                        validation2: { isValid: true, butDuplicated: true }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction12', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ banner: 'monopoly' });
                    expect(body.l[1].dsp).to.deep.equal({ tract: 'compose' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ example: 'unfortunate' });
                    expect(body.l[1].dsp).to.deep.equal({ rubbish: 'cave' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should clear receipts and battles by hand', done => {
                let callbackFn = err => {
                    expect(err).to.be.a('null');

                    done();
                };

                async.parallel([
                    cb => PveBattle.deleteMany({}, cb),
                    cb => Receipt.deleteMany({}, cb)
                ], callbackFn);
            });
        });
    });

    describe('IAP stuff', () => {
        it('Should undo some stuff', () => {
            goblinBase.mobileReceiptValidationConfig.imitate = cacheMobileReceiptValidationImitate;
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