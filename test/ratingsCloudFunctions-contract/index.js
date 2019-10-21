'use strict';

var expect = require('chai').expect,
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
    var unicorn;

    describe('Act 1', () => {
        it('Should create new account', done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');
                expect(body).to.have.property('gClientId');
                expect(body).to.have.property('gClientSecret');
                expect(body).to.not.have.property('gClientSecretSalt');

                unicorn = _unicorn;

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
        it('Should post rating in segment "segm1"', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 13,
                segment: 'segm1'
            }, null, unicorn, callbackFn);
        });
        it('Should get rating from segment "segm1"', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ rec: 13, rank: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                segment: 'segm1'
            }, unicorn, callbackFn);
        });
        it('Should remove rating from segment "segm1"', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.removeRecord', {
                segment: 'segm1'
            }, unicorn, callbackFn);
        });
        it('Should try to get rating from segment "segm1"', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(404);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                segment: 'segm1'
            }, unicorn, callbackFn);
        });
        it('Should post rating in segment "segm1" again', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 13,
                segment: 'segm1'
            }, null, unicorn, callbackFn);
        });
    });
    describe('Act 2', () => {
        it('Should require firstCloudFunction, secondCloudFunction and thirdCloudFunction functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/firstCloudFunction.js')
                .requireAsCloudFunction('./cloudFunctions/secondCloudFunction.js')
                .requireAsCloudFunction('./cloudFunctions/thirdCloudFunction.js')
                ._reinitCloudFunctions(done);
        });
    });
    describe('Act 3', () => {
        it('Should call firstCloudFunction', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ out: 13 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.firstCloudFunction', null, unicorn, callbackFn);
        });
        it('Should call secondCloudFunction', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ segm1: 22, segm2: 88, grand: 'appearance' });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.secondCloudFunction', null, unicorn, callbackFn);
        });
        it('Should get profile', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({
                    humanId: 1,
                    ver: 1,
                    mmr: 0,
                    wlRate: 0,
                    profileData: { grand: 'appearance' },
                });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorn, callbackFn);
        });
        it('Should get rating from segment "segm1"', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ rec: 22, rank: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                segment: 'segm1'
            }, unicorn, callbackFn);
        });
        it('Should get rating from segment "segm2"', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ rec: 88, rank: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                segment: 'segm2'
            }, unicorn, callbackFn);
        });
        it('Should call thirdCloudFunction', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.thirdCloudFunction', null, unicorn, callbackFn);
        });
        it('Should try to get rating from segment "segm1"', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(404);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                segment: 'segm1'
            }, unicorn, callbackFn);
        });
        it('Should try to get rating from segment "segm2"', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(404);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'tops.getPlayerRecord', {
                segment: 'segm2'
            }, unicorn, callbackFn);
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