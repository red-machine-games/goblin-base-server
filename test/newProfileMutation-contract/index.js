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
    var unicorns = [], gClientIds = [], gClientSecrets = [];

    describe('Requiring cloud functions', () => {
        it('Should you know what', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/createNewProfile.js')
                .requireAsCloudFunction('./cloudFunctions/mutateProfile.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction1.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction2.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction3.js')
                .requireAsCloudFunction('./cloudFunctions/cloudFunction4.js')
                ._reinitCloudFunctions(done);
        });
    });
    describe('Act #1', () => {
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

                expect(body).to.deep.equal({ ver: 1, mutationsCount: 0 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
        });
        it('Should get new unicorn', done => {
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
        it('Should get self profile', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.getProfile', null, unicorns[0], callbackFn);
        });
        it('Should call customFunction1 again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ ver: 2, mutationsCount: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
        });
    });
    describe('Act #2', () => {
        it('Should call customFunction2', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ mutationsCount: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction2', null, unicorns[0], callbackFn);
        });
        it('Should call customFunction1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ ver: 2, mutationsCount: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
        });
    });
    describe('Act #3', () => {
        it('Should call customFunction3', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ okay: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction3', null, unicorns[0], callbackFn);
        });
        it('Should get second player directly from db', done => {
            let callbackFn = (err, doc) => {
                expect(err).to.be.a('null');
                expect(doc).to.not.be.a('null');

                expect(doc.ver).to.be.equal(3);
                expect(doc.profileData).to.deep.equal({ hello: 'world', mutationsCount: 2 });

                done();
            };

            Profile.findOne({ humanId: 2 }, { projection: { ver: 1, profileData: 1 } }, callbackFn);
        });
        it('Should call customFunction1', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ ver: 2, mutationsCount: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction1', null, unicorns[0], callbackFn);
        });
    });
    describe('Act #4', () => {
        it('Should call customFunction4', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ okay: 1 });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.cloudFunction4', null, unicorns[0], callbackFn);
        });
        it('Should get second player directly from db', done => {
            let callbackFn = (err, doc) => {
                expect(err).to.be.a('null');
                expect(doc).to.not.be.a('null');

                expect(doc.ver).to.be.equal(4);
                expect(doc.profileData).to.deep.equal({ hello: 'world', mutationsCount: 3, distortion: 'irony' });

                done();
            };

            Profile.findOne({ humanId: 2 }, { projection: { ver: 1, profileData: 1 } }, callbackFn);
        });
        it('Should get first player directly from db', done => {
            let callbackFn = (err, doc) => {
                expect(err).to.be.a('null');
                expect(doc).to.not.be.a('null');

                expect(doc.ver).to.be.equal(2);
                expect(doc.profileData).to.deep.equal({ hello: 'world', mutationsCount: 1 });

                done();
            };

            Profile.findOne({ humanId: 1 }, { projection: { ver: 1, profileData: 1 } }, callbackFn);
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