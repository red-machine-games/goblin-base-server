'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    testUtils = require('../utils/testUtils.js');

const START_AT_HOST = require('../testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../testEntryPoint.js').START_AT_PORT;

var ErrorResponse = require('../../lib/objects/ErrorResponse.js');

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
            .requireAsCloudFunction('./cloudFunctions/cloudFunction1.js')
            .requireAsCloudFunction('./cloudFunctions/cloudFunction2.js')
            .requireAsCloudFunction('./cloudFunctions/cloudFunction3.js')
            ._reinitCloudFunctions(done);
    });

    var unicorns = [], gClientIds = [], gClientSecrets = [];

    _(2).times(n => {
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

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
        });
        it(`Should create new profile #${n + 1}`, done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
        });
    });
    it('Should call cloudFunction1', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.deep.equal({ voyage: 'spy', wave: 'spy' });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
    });
    it('Should call cloudFunction2', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(500);

            expect(body).to.deep.equal(new ErrorResponse(885, 'No single lock acquired', { cfName: 'cloudFunction2' }));

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorns[0], callbackFn);
    });
    it('Should get account for first player', done => {
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
        }, null, null, callbackFn);
    });
    it('Should get profile for first player', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
    });
    it('Should call cloudFunction3', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.deep.equal({ conception: 'convenience', letter: 'beer' });

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorns[0], callbackFn);
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