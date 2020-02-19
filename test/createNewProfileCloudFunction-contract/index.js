'use strict';

var expect = require('chai').expect,
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
    describe('The stuff', () => {
        it('Should do some stuff', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = true;
        });
    });
    describe('Case #1', () => {
        it('Should require createNewProfile and someCloudFunction cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/case1/createNewProfile.js')
                .requireAsCloudFunction('./cloudFunctions/case1/someCloudFunction.js')
                ._reinitCloudFunctions(done);
        });

        var unicorn;

        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should call someCloudFunction', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ val: ['bury', 'relation', 'fraction'] });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.someCloudFunction', { arg: 'fraction' }, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = false;
        });
        it('Should get profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({
                    humanId: 1,
                    ver: 1,
                    mmr: 0,
                    wlRate: 0,
                    profileData: { motif: ['bury', 'relation', 'fraction'] }
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = true;
        });
    });
    describe('Case #2', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should require createNewProfile and someCloudFunction cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/case2/createNewProfile.js')
                .requireAsCloudFunction('./cloudFunctions/case2/someCloudFunction.js')
                ._reinitCloudFunctions(done);
        });

        var unicorn;

        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should call someCloudFunction', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ val: { orchestra: 1, neglect: 2, plane: 3 } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.someCloudFunction', { arg: 'plane' }, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = false;
        });
        it('Should get profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({
                    humanId: 1,
                    ver: 1,
                    mmr: 0,
                    wlRate: 0,
                    profileData: { formation: { orchestra: 1, neglect: 2, plane: 3 } }
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = true;
        });
    });
    describe('Case #3', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should require createNewProfile and someCloudFunction cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/case3/createNewProfile.js')
                .requireAsCloudFunction('./cloudFunctions/case3/someCloudFunction.js')
                ._reinitCloudFunctions(done);
        });

        var unicorn;

        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should call someCloudFunction', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ val: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.someCloudFunction', null, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = false;
        });
        it('Should get profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({
                    humanId: 1,
                    ver: 1,
                    mmr: 0,
                    wlRate: 0,
                    profileData: { maze: 3, hello: { world: 2 } },
                    publicProfileData: { experiment: 'psychology' }
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = true;
        });
    });
    describe('Case #4', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should require createNewProfile, someCloudFunction, mutateProfile and anotherCloudFunction cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/case4/createNewProfile.js')
                .requireAsCloudFunction('./cloudFunctions/case4/someCloudFunction.js')
                .requireAsCloudFunction('./cloudFunctions/case4/mutateProfile.js')
                .requireAsCloudFunction('./cloudFunctions/case4/anotherCloudFunction.js')
                ._reinitCloudFunctions(done);
        });

        var unicorn;

        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should call someCloudFunction', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ cancel: 'contemporary' });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.someCloudFunction', null, unicorn, callbackFn);
        });
        it('Should get profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ disallowDirectProfileExposure: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('Should call anotherCustomFunction', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ benefit: 'atmosphere' });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.anotherCloudFunction', null, unicorn, callbackFn);
        });
    });
    describe('Case #5', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should require createNewProfile cloud function', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/case5/createNewProfile.js')
                ._reinitCloudFunctions(done);
        });

        var unicorn;

        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = false;
        });
        it('Should get profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({
                    humanId: 1,
                    ver: 1,
                    mmr: 1,
                    wlRate: 2
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = true;
        });
    });
    describe('Case #6', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });
        it('Should require createNewProfile and someCloudFunction cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/case6/createNewProfile.js')
                .requireAsCloudFunction('./cloudFunctions/case6/someCloudFunction.js')
                ._reinitCloudFunctions(done);
        });

        var unicorn;

        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
        });
        it('Should call someCloudFunction first time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ theC: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.someCloudFunction', null, unicorn, callbackFn);
        });
        it('Should call someCloudFunction second time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ theC: 2 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.someCloudFunction', null, unicorn, callbackFn);
        });
        it('Should call someCloudFunction third time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ theC: 3 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.someCloudFunction', null, unicorn, callbackFn);
        });
    });

    describe('The stuff', () => {
        it('Should do some stuff', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = false;
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