'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    testUtils = require('../utils/testUtils.js');

var Account = require('../../lib/persistenceSubsystem/dao/account.js'),
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
    const _PLATFORM_VERSION = 'android;0.0.0';

    var unicorn, gClientIds = [], gClientSecrets = [];

    describe('Case with just adding records', () => {
        describe('The case with global.GFeSgp5g === true (no changes)', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 1, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should push cloudFunction1 function', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction1.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction1' }));

                    global.GFeSgp5g = false;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.wRgvM8Ea === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 2, ver: 1, wlRate: 0, mmr: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction1' }));

                    global.wRgvM8Ea = false;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 2,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.M8x8CUgY === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 3, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'M8x8CUgY', { cfName: 'cloudFunction1' }));

                    global.M8x8CUgY = false;

                    done();
                };

                global.M8x8CUgY = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 3,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.fV36sWdU === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 4, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'fV36sWdU', { cfName: 'cloudFunction1' }));

                    global.fV36sWdU = false;

                    done();
                };

                global.fV36sWdU = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 4,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' },
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.UTgyacGT === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 5, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'UTgyacGT', { cfName: 'cloudFunction1' }));

                    global.UTgyacGT = false;

                    done();
                };

                global.UTgyacGT = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 5,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.GZA9FcbS === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 6, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GZA9FcbS', { cfName: 'cloudFunction1' }));

                    global.GZA9FcbS = false;

                    done();
                };

                global.GZA9FcbS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 6,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.K6RYs9tS === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 7, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'K6RYs9tS', { cfName: 'cloudFunction1' }));

                    global.K6RYs9tS = false;

                    done();
                };

                global.K6RYs9tS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 7,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.brjBQgdR === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 8, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.brjBQgdR = false;

                    done();
                };

                global.brjBQgdR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 8,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.GXJ2vPMm === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 9, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.GXJ2vPMm = false;

                    done();
                };

                global.GXJ2vPMm = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 9,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.FtFMwUuS === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 10, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.FtFMwUuS = false;

                    done();
                };

                global.FtFMwUuS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 10,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.qgy2dggs === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 11, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.qgy2dggs = false;

                    done();
                };

                global.qgy2dggs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 11,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.hCkmPUTV === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 12, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.hCkmPUTV = false;

                    done();
                };

                global.hCkmPUTV = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 12,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.znMdj4Hb === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 13, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'znMdj4Hb', { cfName: 'cloudFunction1' }));

                    global.znMdj4Hb = false;

                    done();
                };

                global.znMdj4Hb = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 13,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.VDGSMrqs === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 14, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.VDGSMrqs = false;

                    done();
                };

                global.VDGSMrqs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 14,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.YQGSQ9zR === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 15, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(400);

                    expect(body).to.deep.equal(new ErrorResponse(658, 'Get or create profile first'));

                    global.YQGSQ9zR = false;

                    done();
                };

                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 15,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.Tmf3eQ9m === true', () => {
            it('Should create new account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorn = body.unicorn;
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it('Should create new profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ humanId: 16, ver: 1, mmr: 0, wlRate: 0 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'Tmf3eQ9m'));

                    global.Tmf3eQ9m = false;
                    global.YQGSQ9zR = false;

                    done();
                };

                global.Tmf3eQ9m = true;
                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
            });
            it('Should get account', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = body.unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: _.last(gClientIds),
                    gclientsecret: _.last(gClientSecrets)
                }, null, null, callbackFn);
            });
            it('Should get self profile', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: 16,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { hello: 'chicken' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 13, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 37, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
    });

    var someSeq = 0;

    describe('Case with modifying records', () => {
        describe('The case with global.GFeSgp5g === true (no changes)', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should push cloudFunction2 function', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction2.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction2' }));

                    global.GFeSgp5g = false;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.wRgvM8Ea === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction2' }));

                    global.wRgvM8Ea = false;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.M8x8CUgY === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'M8x8CUgY', { cfName: 'cloudFunction2' }));

                    global.M8x8CUgY = false;

                    done();
                };

                global.M8x8CUgY = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.fV36sWdU === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'fV36sWdU', { cfName: 'cloudFunction2' }));

                    global.fV36sWdU = false;

                    done();
                };

                global.fV36sWdU = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.UTgyacGT === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'UTgyacGT', { cfName: 'cloudFunction2' }));

                    global.UTgyacGT = false;

                    done();
                };

                global.UTgyacGT = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.GZA9FcbS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GZA9FcbS', { cfName: 'cloudFunction2' }));

                    global.GZA9FcbS = false;

                    done();
                };

                global.GZA9FcbS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 15 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 15 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.K6RYs9tS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.K6RYs9tS = false;

                    done();
                };

                global.K6RYs9tS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.brjBQgdR === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.brjBQgdR = false;

                    done();
                };

                global.brjBQgdR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.GXJ2vPMm === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.GXJ2vPMm = false;

                    done();
                };

                global.GXJ2vPMm = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.FtFMwUuS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.FtFMwUuS = false;

                    done();
                };

                global.FtFMwUuS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.qgy2dggs === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.qgy2dggs = false;

                    done();
                };

                global.qgy2dggs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.hCkmPUTV === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.hCkmPUTV = false;

                    done();
                };

                global.hCkmPUTV = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.znMdj4Hb === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'znMdj4Hb', { cfName: 'cloudFunction2' }));

                    global.znMdj4Hb = false;

                    done();
                };

                global.znMdj4Hb = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.VDGSMrqs === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.VDGSMrqs = false;

                    done();
                };

                global.VDGSMrqs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.YQGSQ9zR === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(400);

                    expect(body).to.deep.equal(new ErrorResponse(658, 'Get or create profile first'));

                    global.YQGSQ9zR = false;

                    done();
                };

                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.Tmf3eQ9m === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'Tmf3eQ9m'));

                    global.Tmf3eQ9m = false;
                    global.YQGSQ9zR = false;

                    done();
                };

                global.Tmf3eQ9m = true;
                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 800, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
    });
    describe('Case with removing records', () => {
        describe('The case with global.GFeSgp5g === true (no changes)', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq = 0;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should push cloudFunction3_1 function', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction3_1.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction3_1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction3_1' }));

                    global.GFeSgp5g = false;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_1', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.wRgvM8Ea === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should push cloudFunction3_2 function', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction3_2.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction3_2' }));

                    global.wRgvM8Ea = false;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 15 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.M8x8CUgY === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'M8x8CUgY', { cfName: 'cloudFunction3_2' }));

                    global.M8x8CUgY = false;

                    done();
                };

                global.M8x8CUgY = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete body.rank;
                    expect(body).to.deep.equal({ rec: 85 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.fV36sWdU === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'fV36sWdU', { cfName: 'cloudFunction3_2' }));

                    global.fV36sWdU = false;

                    done();
                };

                global.fV36sWdU = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete body.rank;
                    expect(body).to.deep.equal({ rec: 85 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.UTgyacGT === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'UTgyacGT', { cfName: 'cloudFunction3_2' }));

                    global.UTgyacGT = false;

                    done();
                };

                global.UTgyacGT = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 12 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.GZA9FcbS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GZA9FcbS', { cfName: 'cloudFunction3_2' }));

                    global.GZA9FcbS = false;

                    done();
                };

                global.GZA9FcbS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 11 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.K6RYs9tS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.K6RYs9tS = false;

                    done();
                };

                global.K6RYs9tS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 10 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.brjBQgdR === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.brjBQgdR = false;

                    done();
                };

                global.brjBQgdR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 9 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.GXJ2vPMm === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.GXJ2vPMm = false;

                    done();
                };

                global.GXJ2vPMm = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 8 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.FtFMwUuS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.FtFMwUuS = false;

                    done();
                };

                global.FtFMwUuS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 7 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.qgy2dggs === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.qgy2dggs = false;

                    done();
                };

                global.qgy2dggs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 6 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.hCkmPUTV === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.hCkmPUTV = false;

                    done();
                };

                global.hCkmPUTV = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 5 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.znMdj4Hb === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'znMdj4Hb', { cfName: 'cloudFunction3_2' }));

                    global.znMdj4Hb = false;

                    done();
                };

                global.znMdj4Hb = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 4 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.VDGSMrqs === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.VDGSMrqs = false;

                    done();
                };

                global.VDGSMrqs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 3 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.YQGSQ9zR === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(400);

                    expect(body).to.deep.equal(new ErrorResponse(658, 'Get or create profile first'));

                    global.YQGSQ9zR = false;

                    done();
                };

                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
            });
        });
        describe('The case with global.Tmf3eQ9m === true (double)', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should call cloudFunction3_2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'Tmf3eQ9m'));

                    global.Tmf3eQ9m = false;
                    global.YQGSQ9zR = false;

                    done();
                };

                global.Tmf3eQ9m = true;
                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3_2', null, unicorn, callbackFn);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        wlRate: 0,
                        mmr: 0,
                        profileData: { example: 'monstrous', hello: 'chicken', world: 'decide' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn);
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

    var playerPids = [];

    describe('Case with validating receipt A, changing body and adding record', () => {
        describe('The case with global.GFeSgp5g === true (no changes)', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq = 0;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should push cloudFunction4 function', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction4.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction4' }));

                    global.GFeSgp5g = false;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(0);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.wRgvM8Ea === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction4' }));

                    global.wRgvM8Ea = false;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 15 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.M8x8CUgY === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'M8x8CUgY', { cfName: 'cloudFunction4' }));

                    global.M8x8CUgY = false;

                    done();
                };

                global.M8x8CUgY = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 14 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.fV36sWdU === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'fV36sWdU', { cfName: 'cloudFunction4' }));

                    global.fV36sWdU = false;

                    done();
                };

                global.fV36sWdU = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 13 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.UTgyacGT === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'UTgyacGT', { cfName: 'cloudFunction4' }));

                    global.UTgyacGT = false;

                    done();
                };

                global.UTgyacGT = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 12 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.GZA9FcbS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GZA9FcbS', { cfName: 'cloudFunction4' }));

                    global.GZA9FcbS = false;

                    done();
                };

                global.GZA9FcbS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 11 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.K6RYs9tS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'K6RYs9tS', { cfName: 'cloudFunction4' }));

                    global.K6RYs9tS = false;

                    done();
                };

                global.K6RYs9tS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 10 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.brjBQgdR === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.brjBQgdR = false;

                    done();
                };

                global.brjBQgdR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 9 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.GXJ2vPMm === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GXJ2vPMm', { cfName: 'cloudFunction4' }));

                    global.GXJ2vPMm = false;

                    done();
                };

                global.GXJ2vPMm = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 8 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.FtFMwUuS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.FtFMwUuS = false;

                    done();
                };

                global.FtFMwUuS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 7 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.qgy2dggs === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'qgy2dggs', { cfName: 'cloudFunction4' }));

                    global.qgy2dggs = false;

                    done();
                };

                global.qgy2dggs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 6 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.hCkmPUTV === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.hCkmPUTV = false;

                    done();
                };

                global.hCkmPUTV = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 5 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.znMdj4Hb === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'znMdj4Hb', { cfName: 'cloudFunction4' }));

                    global.znMdj4Hb = false;

                    done();
                };

                global.znMdj4Hb = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 4 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.VDGSMrqs === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.VDGSMrqs = false;

                    done();
                };

                global.VDGSMrqs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 3 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.YQGSQ9zR === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(400);

                    expect(body).to.deep.equal(new ErrorResponse(658, 'Get or create profile first'));

                    global.YQGSQ9zR = false;

                    done();
                };

                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.Tmf3eQ9m === true (double)', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'Tmf3eQ9m'));

                    global.Tmf3eQ9m = false;
                    global.YQGSQ9zR = false;

                    done();
                };

                global.Tmf3eQ9m = true;
                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
    });
    describe('Case with validating receipt B and removing body new node', () => {
        describe('The case with global.GFeSgp5g === true (no changes)', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq = 0;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should push cloudFunction5 function', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction5.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction5' }));

                    global.GFeSgp5g = false;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(0);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptB":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.wRgvM8Ea === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction5' }));

                    global.wRgvM8Ea = false;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 15 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 15 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.M8x8CUgY === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'M8x8CUgY', { cfName: 'cloudFunction5' }));

                    global.M8x8CUgY = false;

                    done();
                };

                global.M8x8CUgY = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete body.rank;
                    expect(body).to.deep.equal({ rec: 85 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete body.rank;
                    expect(body).to.deep.equal({ rec: 322 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.fV36sWdU === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.fV36sWdU = false;

                    done();
                };

                global.fV36sWdU = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 13 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 13 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.UTgyacGT === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.UTgyacGT = false;

                    done();
                };

                global.UTgyacGT = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete body.rank;
                    expect(body).to.deep.equal({ rec: 85 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 12 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.GZA9FcbS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.GZA9FcbS = false;

                    done();
                };

                global.GZA9FcbS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 11 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 11 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.K6RYs9tS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.K6RYs9tS = false;

                    done();
                };

                global.K6RYs9tS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 10 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 10 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.brjBQgdR === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.brjBQgdR = false;

                    done();
                };

                global.brjBQgdR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 9 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 9 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.GXJ2vPMm === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GXJ2vPMm', { cfName: 'cloudFunction5' }));

                    global.GXJ2vPMm = false;

                    done();
                };

                global.GXJ2vPMm = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 8 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 8 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.FtFMwUuS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.FtFMwUuS = false;

                    done();
                };

                global.FtFMwUuS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 7 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 7 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.qgy2dggs === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'qgy2dggs', { cfName: 'cloudFunction5' }));

                    global.qgy2dggs = false;

                    done();
                };

                global.qgy2dggs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 6 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 6 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.hCkmPUTV === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.hCkmPUTV = false;

                    done();
                };

                global.hCkmPUTV = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 5 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 5 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.znMdj4Hb === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'znMdj4Hb', { cfName: 'cloudFunction5' }));

                    global.znMdj4Hb = false;

                    done();
                };

                global.znMdj4Hb = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 4 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 4 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.VDGSMrqs === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.VDGSMrqs = false;

                    done();
                };

                global.VDGSMrqs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 3 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 3 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.YQGSQ9zR === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(400);

                    expect(body).to.deep.equal(new ErrorResponse(658, 'Get or create profile first'));

                    global.YQGSQ9zR = false;

                    done();
                };

                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.Tmf3eQ9m === true (double)', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'Tmf3eQ9m'));

                    global.Tmf3eQ9m = false;
                    global.YQGSQ9zR = false;

                    done();
                };

                global.Tmf3eQ9m = true;
                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptA":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 322, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
    });
    describe('Case with validating receipt C and removing that added record', () => {
        describe('The case with global.GFeSgp5g === true (no changes)', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq = 0;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should push cloudFunction6 function', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction6.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GFeSgp5g', { cfName: 'cloudFunction6' }));

                    global.GFeSgp5g = false;

                    done();
                };

                global.GFeSgp5g = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(0);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.wRgvM8Ea === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'wRgvM8Ea', { cfName: 'cloudFunction6' }));

                    global.wRgvM8Ea = false;

                    done();
                };

                global.wRgvM8Ea = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 15 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });

        describe('The case with global.M8x8CUgY === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.M8x8CUgY = false;

                    done();
                };

                global.M8x8CUgY = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 14 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.fV36sWdU === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'fV36sWdU', { cfName: 'cloudFunction6' }));

                    global.fV36sWdU = false;

                    done();
                };

                global.fV36sWdU = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 13 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.UTgyacGT === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'UTgyacGT', { cfName: 'cloudFunction6' }));

                    global.UTgyacGT = false;

                    done();
                };

                global.UTgyacGT = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 12 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.GZA9FcbS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GZA9FcbS', { cfName: 'cloudFunction6' }));

                    global.GZA9FcbS = false;

                    done();
                };

                global.GZA9FcbS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 11 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.K6RYs9tS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.K6RYs9tS = false;

                    done();
                };

                global.K6RYs9tS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 10 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.brjBQgdR === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.brjBQgdR = false;

                    done();
                };

                global.brjBQgdR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 9 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.GXJ2vPMm === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'GXJ2vPMm', { cfName: 'cloudFunction6' }));

                    global.GXJ2vPMm = false;

                    done();
                };

                global.GXJ2vPMm = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 8 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.FtFMwUuS === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.FtFMwUuS = false;

                    done();
                };

                global.FtFMwUuS = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 7 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.qgy2dggs === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'qgy2dggs', { cfName: 'cloudFunction6' }));

                    global.qgy2dggs = false;

                    done();
                };

                global.qgy2dggs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 6 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.hCkmPUTV === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.hCkmPUTV = false;

                    done();
                };

                global.hCkmPUTV = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 5 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.znMdj4Hb === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'znMdj4Hb', { cfName: 'cloudFunction6' }));

                    global.znMdj4Hb = false;

                    done();
                };

                global.znMdj4Hb = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 4 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.VDGSMrqs === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    global.VDGSMrqs = false;

                    done();
                };

                global.VDGSMrqs = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 3 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.YQGSQ9zR === true', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(400);

                    expect(body).to.deep.equal(new ErrorResponse(658, 'Get or create profile first'));

                    global.YQGSQ9zR = false;

                    done();
                };

                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('The case with global.Tmf3eQ9m === true (double)', () => {
            it('Should get account #1', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                someSeq++;
                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should just get pid of player', done => {
                let callbackFn = (err, doc) => {
                    expect(err).to.be.a('null');
                    expect(doc).to.not.be.a('null');

                    playerPids.push(doc.pid);

                    done();
                };

                Account.findOne(
                    { gClientId: gClientIds[someSeq], gClientSecret: gClientSecrets[someSeq] },
                    { projection: { pid: 1, _id: 0 } },
                    callbackFn
                );
            });
            it('Should get self profile #1', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(9999, 'Tmf3eQ9m'));

                    global.Tmf3eQ9m = false;
                    global.YQGSQ9zR = false;

                    done();
                };

                global.Tmf3eQ9m = true;
                global.YQGSQ9zR = true;
                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get account #2', done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    unicorn = _unicorn;

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                    gclientid: gClientIds[someSeq],
                    gclientsecret: gClientSecrets[someSeq]
                }, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get self profile #2', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check profile', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({
                        humanId: someSeq + 1,
                        ver: 1,
                        mmr: 0,
                        wlRate: 0,
                        profileData: { hello: 'chicken', world: 'decide', tin: 'frighten', example: 'monstrous', embox: 'evening' }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should check receipt in db', done => {
                let callbackFn = (err, docs) => {
                    expect(err).to.be.a('null');
                    expect(docs.length).to.be.equal(1);

                    done();
                };

                Receipt.find({ pid: playerPids[someSeq], receipt: `{"receiptC":${someSeq + 1}}` }).toArray(callbackFn);
            });
            it('Should get rating from segment "segm1"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm1'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "segm2"', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 85, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'segm2'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
            });
            it('Should get rating from segment "deposit"', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'deposit'
                }, unicorn, callbackFn, _PLATFORM_VERSION);
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