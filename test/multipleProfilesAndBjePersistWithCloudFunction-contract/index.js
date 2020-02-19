'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    testUtils = require('../utils/testUtils.js');

const START_AT_HOST = require('../!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../!testEntryPoint.js').START_AT_PORT;

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

    var cacheMobileReceiptValidationImitate;

    describe('IAP stuff', () => {
        it('Should do some stuff', () => {
            cacheMobileReceiptValidationImitate = goblinBase.mobileReceiptValidationConfig.imitate;
            goblinBase.mobileReceiptValidationConfig.imitate = { isValid: true };
        });
    });

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

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn, _PLATFORM_VERSION);
            });
            it(`Should create new profile #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn, _PLATFORM_VERSION);
            });
        });
    });
    describe('The cases', () => {
        describe('Case #1', () => {
            it('Should require cloudFunction1 and cloudFunction2 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction1.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction2.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction1', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ okay: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(1);
                    expect(body.l[0].dsp).to.deep.equal({ thisIsFor: 'first' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(1);
                    expect(body.l[0].dsp).to.deep.equal({ thisIsFor: 'second' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(1);
                    expect(body.l[0].dsp).to.deep.equal({ thisIsFor: 'fart' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
            it('Should try to call cloudFunction2', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(868, 'Some of the presented Human IDs does not exist', { cfName: 'cloudFunction2' }));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get new unicorn after error', done => {
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
            it('Should get self profile again', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('Case #2', () => {
            it('Should require cloudFunction3 and cloudFunction4 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction3.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction4.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction3', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ okay: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('First player should get his rating', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 10, rank: 3 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Second player should get his rating', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 20, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Third player should get his rating', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 30, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
            it('Should try to call cloudFunction4', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(868, 'Some of the presented Human IDs does not exist', { cfName: 'cloudFunction4' }));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get new unicorn after error', done => {
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
            it('Should get self profile again', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('Case #3', () => {
            it('Should require cloudFunction5 and cloudFunction6 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction5.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction6.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction5', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rating1: 10, rating2: 20, rating3: 30 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction5', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should try to call cloudFunction6', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(752, 'No such human id or segment', { cfName: 'cloudFunction6' }));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction6', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get new unicorn after error', done => {
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
            it('Should get self profile again', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('Case #4', () => {
            it('Should require cloudFunction7 and cloudFunction8 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction7.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction8.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction7', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ okay: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction7', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'lost 1' } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'lost 2' } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'lost 3' } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
            it('Should try to call cloudFunction8', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(802, 'Trying to persist profile update with nonexistent Human ID', { cfName: 'cloudFunction8' }));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction8', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get new unicorn after error', done => {
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
            it('Should get self profile again', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('Case #5', () => {
            it('Should require cloudFunction9 and cloudFunction10 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction9.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction10.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction9', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ node1: 'lost 1', node2: 'lost 2', node3: 'lost 3' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction9', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should try to call cloudFunction10', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(724, 'No such human id or node path', { cfName: 'cloudFunction10' }));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction10', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get new unicorn after error', done => {
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
            it('Should get self profile again', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('Case #6', () => {
            var cachedProfile1, cachedProfile2,
                cachedRating1, cachedRating2, cachedRating3,
                cachedBje1, cachedBje2, cachedBje3;

            it('Should require cloudFunction11 and cloudFunction12 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction11.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction12.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction11', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ node1: 'lost 1', node2: 'lost 2' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction11', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'win 1' } }
                    });

                    cachedProfile1 = body;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'win 2' } }
                    });

                    cachedProfile2 = body;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('First player should get his rating', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 100, rank: 2 });

                    cachedRating1 = body.rec;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Second player should get his rating', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 200, rank: 1 });

                    cachedRating2 = body.rec;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Third player should get his rating', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 300, rank: 1 });

                    cachedRating3 = body.rec;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ incapable: 'fever' });

                    cachedBje1 = body;
                    delete cachedBje1.now;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(2);
                    expect(body.l[0].dsp).to.deep.equal({ halt: 'pray' });

                    cachedBje2 = body;
                    delete cachedBje2.now;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(1);

                    cachedBje3 = body;
                    delete cachedBje3.now;

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
            it('Should try to call cloudFunction12', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(868, 'Some of the presented Human IDs does not exist', { cfName: 'cloudFunction12' }));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction12', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get new unicorn after error', done => {
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
            it('Should get profile for first player again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal(cachedProfile1);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get profile for second player again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal(cachedProfile2);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('First player should get his rating again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('rec', cachedRating1);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Second player should get his rating again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('rec', cachedRating2);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Third player should get his rating again', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('rec', cachedRating3);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete body.now;
                    expect(body).to.deep.equal(cachedBje1);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete body.now;
                    expect(body).to.deep.equal(cachedBje2);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    delete body.now;
                    expect(body).to.deep.equal(cachedBje3);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('Case #7', () => {
            it('Should require cloudFunction13 and cloudFunction14 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction13.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction14.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction13', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ node1: 'win 1', node2: 'win 2' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction13', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'solid' } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'ceiling' } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('First player should get his rating', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 1000, rank: 2 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Second player should get his rating', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 2000, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Third player should get his rating', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 3000, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by first player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(3);
                    expect(body.l[0].dsp).to.deep.equal({ dose: 'proud' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by second player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(3);
                    expect(body.l[0].dsp).to.deep.equal({ lock: 'oppose' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should list pve battles by third player', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body.l.length).to.be.equal(1);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction14', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ isValid: true, butDuplicated: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction14', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('Case #8', () => {
            it('Should require cloudFunction15 and cloudFunction16 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction15.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction16.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction15', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ node1: 'solid', node2: 'ceiling' });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction15', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'dish' } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'ceiling' } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'neighbour' } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
            it('First player should get his rating', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ rec: 1000, rank: 1 });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Second player should get his rating', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'hello'
                }, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Third player should get his rating', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(404);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                    segment: 'world'
                }, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction16', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ isValid: true, butDuplicated: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction16', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('Case #9', () => {
            it('Should require cloudFunction17 and cloudFunction18 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction17.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction18.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction17', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({});

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction17', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'dish' } },
                        publicProfileData: { sphere: { silence: 'strike' } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: { hello: { world: 'ceiling' } },
                        publicProfileData: { sphere: { cruelty: 'crosswalk' } }
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
            });
            it('Should try to call cloudFunction18', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(802, 'Trying to persist profile update with nonexistent Human ID', { cfName: 'cloudFunction18' }));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction18', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get new unicorn after error', done => {
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
            it('Should get self profile again', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('Case #10', () => {
            it('Should require cloudFunction19 cloud function', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction19.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction19', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ okay: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction19', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: {},
                        publicProfileData: {}
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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
                        profileData: {},
                        publicProfileData: {}
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn, _PLATFORM_VERSION);
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
                        profileData: {}
                    });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn, _PLATFORM_VERSION);
            });
        });
        describe('Case #11', () => {
            it('Should require cloudFunction20, cloudFunction21, cloudFunction22 and cloudFunction23 cloud functions', done => {
                goblinBase
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction20.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction21.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction22.js')
                    .requireAsCloudFunction('./cloudFunctions/cloudFunction23.js')
                    ._reinitCloudFunctions(done);
            });
            it('Should call cloudFunction20', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ okay: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction20', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should try to call cloudFunction21', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(500);

                    expect(body).to.deep.equal(new ErrorResponse(896, 'This path is conflicted with already set', { cfName: 'cloudFunction21' }));

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction21', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should get new unicorn after error', done => {
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
            it('Should get self profile again', done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction22', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ okay: true });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction22', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
            });
            it('Should call cloudFunction23', done => {
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ node1: 1, node2: { b: { c: 1 } } });

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction23', null, unicorns[0], callbackFn, _PLATFORM_VERSION);
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