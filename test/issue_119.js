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
    var gClientId, gClientSecret,
        unicorn1, unicorn2;

    it('Should create new account #1', done => {
        let callbackFn = (err, response, body, _unicorn) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');
            expect(body).to.have.property('gClientId');
            expect(body).to.have.property('gClientSecret');

            expect(body.gClientId.length).to.be.equal(32);

            gClientId = body.gClientId;
            gClientSecret = body.gClientSecret;
            unicorn1 = _unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
    });
    it('Should do some stuff with first unicorn', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'utils.getServerTime', null, unicorn1, callbackFn);
    });
    it('Should get new unicorn with old id and secret', done => {
        let callbackFn = (err, response, body, _unicorn) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');
            expect(body.gClientId.length).to.be.equal(32);

            unicorn2 = _unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            gclientid: gClientId,
            gclientsecret: gClientSecret
        }, null, null, callbackFn);
    });
    it('Should do some stuff with second unicorn', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'utils.getServerTime', null, unicorn2, callbackFn);
    });
    it('Should try to do some stuff with first unicorn', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(401);

            expect(body).to.deep.equal({ index: 423, message: 'Unknown unicorn' });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'utils.getServerTime', null, unicorn1, callbackFn);
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