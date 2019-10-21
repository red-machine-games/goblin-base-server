'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    testUtils = require('../utils/testUtils.js');

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
    const _PLATFORM_VERSION = 'android;0.0.0';

    var cacheMobileReceiptValidationImitate;

    describe('IAP stuff', () => {
        it('Should do some stuff', () => {
            cacheMobileReceiptValidationImitate = goblinBase.mobileReceiptValidationConfig.imitate;
            goblinBase.mobileReceiptValidationConfig.imitate = { isValid: true };
        });
    });

    var unicorn;

    describe('New player', () => {
        it('Should create new account', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

                unicorn = body.unicorn;

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn, _PLATFORM_VERSION);
        });
        it('Should create new profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
    });
    describe('Pushing cloud functions', () => {
        it('Should push cloudFunction1, cloudFunction2 and cloudFunction3 cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/cloudFunction1.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction2.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction3.js')
                ._reinitCloudFunctions(done);
        });
    });
    describe('The case', () => {
        it('Should call cloudFunction1 to validate receipt A', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ isValid: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should check profile #1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.profileData).to.deep.equal({ asylum: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should call cloudFunction1 to validate receipt A more time', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ isValid: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should check profile #2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.profileData).to.deep.equal({ asylum: 1, layer: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should call cloudFunction2 to validate receipt B', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ isValid: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should check profile #3', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.profileData).to.deep.equal({ asylum: 1, layer: 1, policeman: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should force all receipts to be invalid', () => {
            goblinBase.mobileReceiptValidationConfig.imitate.isValid = false;
        });
        it('Should call cloudFunction3 to validate receipt C', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ isValid: false });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should check profile #4', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.profileData).to.deep.equal({ asylum: 1, layer: 1, policeman: 1, beach: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should call cloudFunction3 to validate receipt C more', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ isValid: false });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should check profile #4', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.profileData).to.deep.equal({ asylum: 1, layer: 1, policeman: 1, beach: 1, commerce: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should force all receipts to be back valid', () => {
            goblinBase.mobileReceiptValidationConfig.imitate.isValid = true;
        });
        it('Should call cloudFunction3 to validate receipt C more', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ isValid: true, butDuplicated: false });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should check profile #5', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.profileData).to.deep.equal({ asylum: 1, layer: 1, policeman: 1, beach: 1, commerce: 1, flour: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should call cloudFunction3 to validate receipt C more', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ isValid: true, butDuplicated: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
        it('Should check profile #5', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.profileData).to.deep.equal({ asylum: 1, layer: 1, policeman: 1, beach: 1, commerce: 1, flour: 1, wine: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn, _PLATFORM_VERSION);
        });
    });

    describe('IAP stuff', () => {
        it('Should undo some stuff', () => {
            goblinBase.mobileReceiptValidationConfig.imitate = cacheMobileReceiptValidationImitate;
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