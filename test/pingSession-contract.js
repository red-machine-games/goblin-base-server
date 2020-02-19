'use strict';

var expect = require('chai').expect,
    async = require('async');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

const START_AT_HOST = require('./!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('./!testEntryPoint.js').START_AT_PORT;

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
    var unicorn;

    it('Should create new account', done => {
        let callbackFn = (err, response, body, _unicorn) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            unicorn = _unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
    });
    it('Should ping session and get 200', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'utils.ping', null, unicorn, callbackFn, null, true);
    });
    it('Should wait 2500 ms', done => setTimeout(done, 2500));
    it('Should ping session and get 401', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(401);

            expect(body).to.deep.equal(new ErrorResponse(891, 'Unknown unicorn'));

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'utils.ping', null, unicorn, callbackFn, null, true);
    });
    it('Should get account to refresh lastAction', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, unicorn, callbackFn);
    });
    it('Should ping session and get 200', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'utils.ping', null, unicorn, callbackFn, null, true);
    });
    it('Should wait 2500 ms', done => setTimeout(done, 2500));
    it('Should ping session and get 401', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(401);

            expect(body).to.deep.equal(new ErrorResponse(891, 'Unknown unicorn'));

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'utils.ping', null, unicorn, callbackFn, null, true);
    });
    it('Should get account to refresh lastAction', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.not.have.property('_id');

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, unicorn, callbackFn);
    });

    var cachedSessionLifetime;

    it('Should change session lifetime', () => {
        cachedSessionLifetime = goblinBase.accountsConfig.sessionLifetime;
        goblinBase.accountsConfig.sessionLifetime = 3000;
    });
    it('Should ping session and get 200', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'utils.ping', null, unicorn, callbackFn, null, true);
    });
    it('Should wait 3100 ms so session will close', done => setTimeout(done, 3100));
    it('Should ping session and get 401', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(401);

            expect(body).to.deep.equal(new ErrorResponse(891, 'Unknown unicorn'));

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'utils.ping', null, unicorn, callbackFn, null, true);
    });
    it('Should get account and get 401', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(401);

            expect(body).to.deep.equal(new ErrorResponse(423, 'Unknown unicorn'));

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, unicorn, callbackFn);
    });
    it('Should change session lifetime back', () => {
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