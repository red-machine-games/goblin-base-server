'use strict';

var expect = require('chai').expect,
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
    describe('Adding cloud functions', () => {
        it('Should you know what', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/createNewProfile.js')
                .requireAsCloudFunction('./cloudFunctions/mutateProfile.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction11.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction12.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction21.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction22.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction31.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction32.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction33.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction34.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction41.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction42.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction43.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction44.js')
                ._reinitCloudFunctions(done);
        });
    });

    var unicorn, gClientId, gClientSecret;

    describe('Add player', () => {
        it(`Should create new account`, done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

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
    });
    describe('Act #1 - Just run', () => {
        it('Should call cloudFunction11', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ law: { witness: 'cry' } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction11', null, unicorn, callbackFn);
        });
    });
    describe('Act #2 - Try to run fixed functions', () => {
        it('Should try to call createNewProfile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(500);

                expect(body).to.deep.equal(new ErrorResponse(778, 'Cannot run fixed function from within a function', { cfName: 'cloudFunction21' }));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction21', null, unicorn, callbackFn);
        });
        it('Should reget unicorn', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body.gClientId).to.be.equal(gClientId);
                expect(body.gClientSecret).to.be.equal(gClientSecret);

                unicorn = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId,
                gclientsecret: gClientSecret
            }, null, null, callbackFn);
        });
        it('Should get profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('Should try to call mutateProfile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(500);

                expect(body).to.deep.equal(new ErrorResponse(778, 'Cannot run fixed function from within a function', { cfName: 'cloudFunction22' }));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction22', null, unicorn, callbackFn);
        });
        it('Should reget unicorn', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body.gClientId).to.be.equal(gClientId);
                expect(body.gClientSecret).to.be.equal(gClientSecret);

                unicorn = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId,
                gclientsecret: gClientSecret
            }, null, null, callbackFn);
        });
        it('Should get profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
    });
    describe('Act #3 - Internal and external access', () => {
        it('Should call external function with route', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ okay: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction33', null, unicorn, callbackFn);
        });
        it('Should try to call external function from within another function', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(500);

                expect(body).to.deep.equal(new ErrorResponse(780, 'This function can be accessed only from external', { cfName: 'cloudFunction31' }));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction31', null, unicorn, callbackFn);
        });
        it('Should reget unicorn', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body.gClientId).to.be.equal(gClientId);
                expect(body.gClientSecret).to.be.equal(gClientSecret);

                unicorn = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId,
                gclientsecret: gClientSecret
            }, null, null, callbackFn);
        });
        it('Should get profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('Should try to call internal function with route', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(500);

                expect(body).to.deep.equal(new ErrorResponse(779, 'This function can be accessed only from internal', { cfName: 'cloudFunction34' }));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction34', null, unicorn, callbackFn);
        });
        it('Should reget unicorn', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body.gClientId).to.be.equal(gClientId);
                expect(body.gClientSecret).to.be.equal(gClientSecret);

                unicorn = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', {
                gclientid: gClientId,
                gclientsecret: gClientSecret
            }, null, null, callbackFn);
        });
        it('Should get profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('Should call internal function from within another function', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ contract: { okay: true } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction32', null, unicorn, callbackFn);
        });
    });
    describe('Act #4 - Check locking', () => {
        it('Should call cloudFunction41', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ tongue: { give: { exile: [1], lack: [1] }, systematic: [1] } });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction41', null, unicorn, callbackFn);
        });
        it('Should call cloudFunction43', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(500);

                expect(body).to.deep.equal(new ErrorResponse(886, 'Cannot operate with lock from sub-run function', { cfName: 'cloudFunction43' }));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction43', null, unicorn, callbackFn);
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