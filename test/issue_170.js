'use strict';

var expect = require('chai').expect,
    async = require('async');

var goblinBase = require('../index.js').getGoblinBase();

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
    const N = 5000;

    var cachedSessionLifetime;

    it('Should do some stuff', () => {
        cachedSessionLifetime = goblinBase.accountsConfig.sessionLifetime;
        goblinBase.accountsConfig.sessionLifetime = N;
    });

    var unicorn, gClientId, gClientSecret;

    it('Should create new account', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');
            expect(body).to.have.property('gClientId');
            expect(body).to.have.property('gClientSecret');

            unicorn = body.unicorn;
            gClientId = body.gClientId;
            gClientSecret = body.gClientSecret;

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
    it('Should get unicorn again', done => {
        let callbackFn = (err, response, body, _unicorn) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');

            unicorn = _unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            gclientid: gClientId,
            gclientsecret: gClientSecret
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
    it(`Should wait ${N + 100}ms to let session to die`, done => setTimeout(done, N + 100));
    it('Should try to get profile again with dead unicorn', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(401);

            expect(body).to.deep.equal(new ErrorResponse(423, 'Unknown unicorn'));

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
    });
    it('Should get unicorn again and again', done => {
        let callbackFn = (err, response, body, _unicorn) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');

            unicorn = _unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            gclientid: gClientId,
            gclientsecret: gClientSecret
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
    it('Should undo some stuff', () => {
        goblinBase.accountsConfig.sessionLifetime = cachedSessionLifetime;
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