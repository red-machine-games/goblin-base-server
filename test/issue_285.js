'use strict';

var expect = require('chai').expect,
    async = require('async');

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./testEntryPoint.js').START_AT_PORT;

var ErrorResponse = require('../lib/objects/ErrorResponse.js');

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    var unicorns = [], gClientIds = [], gClientSecrets = [];

    describe('Vk guy #1', () => {
        it('Should create new anon account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);
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

                expect(body).to.deep.equal({ humanId: 1, mmr: 0, ver: 1, wlRate: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[0], callbackFn);
        });
        it('Should see that no other Vk profile exists', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ has: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.hasVkProf', { vktoken: 1 }, unicorns[0], callbackFn);
        });
        it('Should link with noprof parameter', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: false });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkVkProfile', {
                vktoken: 1, noprof: 1
            }, unicorns[0], callbackFn);
        });
        it('Should login with id and secret', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[0] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientIds[0],
                gclientsecret: gClientSecrets[0]
            }, null, null, callbackFn);
        });
        it('Should get self profile #1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 1);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
        });
        it('Should login with Vk "token"', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[0] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', { vktoken: 1 }, null, null, callbackFn);
        });
        it('Should get self profile #2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 1);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
        });
        it('Should try to unlink current account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(1041, 'Account is bi-login. This is irreversible'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.unlinkSocialProfile', null, unicorns[0], callbackFn);
        });
        it('Should see that "other" Vk profile exists', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ has: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.hasVkProf', { vktoken: 1 }, unicorns[0], callbackFn);
        });
    });
    describe('Ok guy #1', () => {
        it('Should create new anon account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);
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

                expect(body).to.deep.equal({ humanId: 2, mmr: 0, ver: 1, wlRate: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[1], callbackFn);
        });
        it('Should see that no other Ok profile exists', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ has: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.hasOkProf', { oktoken: 1 }, unicorns[1], callbackFn);
        });
        it('Should link with noprof parameter', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: false });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkOkProfile', {
                oktoken: 1, noprof: 1
            }, unicorns[1], callbackFn);
        });
        it('Should login with id and secret', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[1] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientIds[1],
                gclientsecret: gClientSecrets[1]
            }, null, null, callbackFn);
        });
        it('Should get self profile #1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 2);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
        });
        it('Should login with Ok "token"', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[1] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', { oktoken: 1 }, null, null, callbackFn);
        });
        it('Should get self profile #2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 2);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[1], callbackFn);
        });
        it('Should try to unlink current account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(1041, 'Account is bi-login. This is irreversible'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.unlinkSocialProfile', null, unicorns[1], callbackFn);
        });
        it('Should see that "other" Ok profile exists', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ has: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.hasOkProf', { oktoken: 1 }, unicorns[1], callbackFn);
        });
    });
    describe('Fb guy #1', () => {
        it('Should create new anon account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);
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

                expect(body).to.deep.equal({ humanId: 3, mmr: 0, ver: 1, wlRate: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[2], callbackFn);
        });
        it('Should see that no other Fb profile exists', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ has: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.hasFbProf', { fbtoken: 1 }, unicorns[2], callbackFn);
        });
        it('Should link with noprof parameter', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: false });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkFbProfile', {
                fbtoken: 1, noprof: 1
            }, unicorns[2], callbackFn);
        });
        it('Should login with id and secret', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[2] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientIds[2],
                gclientsecret: gClientSecrets[2]
            }, null, null, callbackFn);
        });
        it('Should get self profile #1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 3);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
        });
        it('Should login with Fb "token"', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[2] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', { fbtoken: 1 }, null, null, callbackFn);
        });
        it('Should get self profile #2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 3);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[2], callbackFn);
        });
        it('Should try to unlink current account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(1041, 'Account is bi-login. This is irreversible'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.unlinkSocialProfile', null, unicorns[2], callbackFn);
        });
        it('Should see that "other" Fb profile exists', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ has: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.hasFbProf', { fbtoken: 1 }, unicorns[2], callbackFn);
        });
    });
    describe('Vk guy #2', () => {
        it('Should create new anon account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);
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

                expect(body).to.deep.equal({ humanId: 4, mmr: 0, ver: 1, wlRate: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[3], callbackFn);
        });
        it('Should try to link with "noprof" parameter', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(1027, 'Already has profile for given social id. Transform current is not possible'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkVkProfile', {
                vktoken: 1, noprof: 1
            }, unicorns[3], callbackFn);
        });
        it('Should link without "noprof" parameter', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: false });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkVkProfile', { vktoken: 1 }, unicorns[3], callbackFn);
        });
        it('Should login with id and secret #1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[3] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientIds[3],
                gclientsecret: gClientSecrets[3]
            }, null, null, callbackFn);
        });
        it('Should get self profile #1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 1);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[3], callbackFn);
        });
        it('Should unlink current account', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.unlinkSocialProfile', null, unicorns[3], callbackFn);
        });
        it('Should login with id and secret #2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[3] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientIds[3],
                gclientsecret: gClientSecrets[3]
            }, null, null, callbackFn);
        });
        it('Should get self profile #2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 4);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[3], callbackFn);
        });
    });
    describe('Ok guy #2', () => {
        it('Should create new anon account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);
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

                expect(body).to.deep.equal({ humanId: 5, mmr: 0, ver: 1, wlRate: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[4], callbackFn);
        });
        it('Should try to link with "noprof" parameter', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(1032, 'Already has profile for given social id. Transform current is not possible'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkOkProfile', {
                oktoken: 1, noprof: 1
            }, unicorns[4], callbackFn);
        });
        it('Should link without "noprof" parameter', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: false });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkOkProfile', { oktoken: 1 }, unicorns[4], callbackFn);
        });
        it('Should login with id and secret #1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[4] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientIds[4],
                gclientsecret: gClientSecrets[4]
            }, null, null, callbackFn);
        });
        it('Should get self profile #1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 2);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[4], callbackFn);
        });
        it('Should unlink current account', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.unlinkSocialProfile', null, unicorns[4], callbackFn);
        });
        it('Should login with id and secret #2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[4] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientIds[4],
                gclientsecret: gClientSecrets[4]
            }, null, null, callbackFn);
        });
        it('Should get self profile #2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 5);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[4], callbackFn);
        });
    });
    describe('Fb guy #2', () => {
        it('Should create new anon account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns.push(body.unicorn);
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

                expect(body).to.deep.equal({ humanId: 6, mmr: 0, ver: 1, wlRate: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[5], callbackFn);
        });
        it('Should try to link with "noprof" parameter', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal(new ErrorResponse(1037, 'Already has profile for given social id. Transform current is not possible'));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkFbProfile', {
                fbtoken: 1, noprof: 1
            }, unicorns[5], callbackFn);
        });
        it('Should link without "noprof" parameter', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ success: true, newProfile: false });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkFbProfile', { fbtoken: 1 }, unicorns[5], callbackFn);
        });
        it('Should login with id and secret #1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[5] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientIds[5],
                gclientsecret: gClientSecrets[5]
            }, null, null, callbackFn);
        });
        it('Should get self profile #1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 3);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[5], callbackFn);
        });
        it('Should unlink current account', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.unlinkSocialProfile', null, unicorns[5], callbackFn);
        });
        it('Should login with id and secret #2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorns[5] = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientIds[5],
                gclientsecret: gClientSecrets[5]
            }, null, null, callbackFn);
        });
        it('Should get self profile #2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('humanId', 6);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[5], callbackFn);
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