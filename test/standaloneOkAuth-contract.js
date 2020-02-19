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
    var unicorn;

    it('Should create a new account with only OK token', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');
            expect(body).to.not.have.property('gClientId');
            expect(body).to.not.have.property('gClientSecret');

            unicorn = body.unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            oktoken: 'someOkToken'
        }, null, null, callbackFn);
    });
    it('Should create new profile', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('ok', 'someOkToken');

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
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