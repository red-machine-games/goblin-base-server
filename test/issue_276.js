'use strict';

var expect = require('chai').expect,
    async = require('async');

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    const FB_TOKEN = 'proclaim';

    var unicorn, gClientId, gClientSecret;

    it('Should create new anon account', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');

            unicorn = body.unicorn;
            gClientId = body.gClientId;
            gClientSecret = body.gClientSecret;

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

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
    });
    it('Should link account with FB', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkFbProfile', { fbtoken: FB_TOKEN }, unicorn, callbackFn);
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
            gclientid: gClientId, gclientsecret: gClientSecret
        }, null, null, callbackFn);
    });
    it('Should get self profile', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body.fb).to.be.equal(FB_TOKEN);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
    });
    it('Should unlink account from FB', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.unlinkSocialProfile', null, unicorn, callbackFn);
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
            gclientid: gClientId, gclientsecret: gClientSecret
        }, null, null, callbackFn);
    });
    it('Should get self profile', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.not.have.property('fb');

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
    });
    it('Should link account with FB again', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.linkFbProfile', { fbtoken: FB_TOKEN }, unicorn, callbackFn);
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