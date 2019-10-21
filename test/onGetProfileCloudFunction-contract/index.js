'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    testUtils = require('../utils/testUtils.js');

var Profile = require('../../lib/persistenceSubsystem/dao/profile.js');

const START_AT_HOST = require('../testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    it('Should require cloud functions', done => {
        goblinBase
            .requireAsCloudFunction('./cloudFunctions/createNewProfile.js')
            .requireAsCloudFunction('./cloudFunctions/mutateProfile.js')
            .requireAsCloudFunction('./cloudFunctions/onGetProfile.js')
            .requireAsCloudFunction('./cloudFunctions/cloudFunction1.js')
            ._reinitCloudFunctions(done);
    });

    var unicorn, gClientId, gClientSecret;

    it(`Should create new account`, done => {
        let callbackFn = (err, response, body, _unicorn) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');
            expect(body).to.have.property('gClientId');
            expect(body).to.have.property('gClientSecret');

            unicorn = _unicorn;
            gClientId = body.gClientId;
            gClientSecret = body.gClientSecret;

            done();
        };

        testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
    });
    it(`Should create new profile`, done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn);
    });
    it('Should call customFunction1 first time', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.deep.equal({ laVer: 1, mutationsCount: 0, laGets: 1 });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
    });
    it('Should get new unicorn', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');

            unicorn = body.unicorn;

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
    it('Should call customFunction1 second time', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.deep.equal({ laVer: 2, mutationsCount: 1, laGets: 2 });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
    });
    it('Should get new unicorn', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('unicorn');

            unicorn = body.unicorn;

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
    it('Should call customFunction1 third time', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.deep.equal({ laVer: 2, mutationsCount: 1, laGets: 3 });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn);
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