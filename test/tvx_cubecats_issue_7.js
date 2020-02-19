'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    testUtils = require('./utils/testUtils.js');

var ErrorResponse = require('../lib/objects/ErrorResponse.js');

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
    const SO_THE_ID = 'hu_man1337@worldwide.org',
        SO_THE_SECRET = 'aGloriousPassword1818';

    var unicorn;

    it('Should create new account with custom id and secret', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');
            expect(body).to.have.property('gClientId', SO_THE_ID);
            expect(body).to.have.property('gClientSecret', SO_THE_SECRET);

            unicorn = body.unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            gcustomid: SO_THE_ID,
            gcustomsecret: SO_THE_SECRET
        }, null, null, callbackFn);
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
    it('Should try to add account with all same custom g data', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(400);

            expect(body).to.deep.equal(new ErrorResponse(956, 'This login is taken'));

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            gcustomid: SO_THE_ID,
            gcustomsecret: SO_THE_SECRET
        }, null, null, callbackFn);
    });
    it('Should try to add account with same custom g data id', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(400);

            expect(body).to.deep.equal(new ErrorResponse(956, 'This login is taken'));

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            gcustomid: SO_THE_ID,
            gcustomsecret: 'ANOTHER_RANDOM_PASSWORD'
        }, null, null, callbackFn);
    });
    it('Should add account with same custom g data secret', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');
            expect(body).to.have.property('gClientId', 'ANOTHER_RANDOM_USER');
            expect(body).to.have.property('gClientSecret', SO_THE_SECRET);

            unicorn = body.unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            gcustomid: 'ANOTHER_RANDOM_USER',
            gcustomsecret: SO_THE_SECRET
        }, null, null, callbackFn);
    });
    it('Should create new profile', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.deep.equal({ humanId: 2, mmr: 0, ver: 1, wlRate: 0 });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
    });
    it('Should login as first guy', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');
            expect(body).to.have.property('gClientId', SO_THE_ID);
            expect(body).to.have.property('gClientSecret', SO_THE_SECRET);

            unicorn = body.unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            gclientid: SO_THE_ID,
            gclientsecret: SO_THE_SECRET
        }, null, null, callbackFn);
    });
    it('Should get profile as first guy', done => {
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

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
    });
    it('Should login as second guy', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');
            expect(body).to.have.property('gClientId', 'ANOTHER_RANDOM_USER');
            expect(body).to.have.property('gClientSecret', SO_THE_SECRET);

            unicorn = body.unicorn;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            gclientid: 'ANOTHER_RANDOM_USER',
            gclientsecret: SO_THE_SECRET
        }, null, null, callbackFn);
    });
    it('Should get profile as second guy', done => {
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

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
    });
    it('Should try to login as first guy with wrong secret(password)', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(400);

            expect(body).to.deep.equal(new ErrorResponse(22, 'Invalid gClientId and/or gClientSecret'));

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            gclientid: SO_THE_ID,
            gclientsecret: 'aWrongPassword'
        }, null, null, callbackFn);
    });
    it('Should try to login as second guy with wrong secret(password)', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(400);

            expect(body).to.deep.equal(new ErrorResponse(22, 'Invalid gClientId and/or gClientSecret'));

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
            gclientid: 'ANOTHER_RANDOM_USER',
            gclientsecret: 'aWrongPassword'
        }, null, null, callbackFn);
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