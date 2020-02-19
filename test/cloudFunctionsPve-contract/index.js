'use strict';

var expect = require('chai').expect,
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    testUtils = require('../utils/testUtils.js');

const START_AT_HOST = require('../!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../!testEntryPoint.js').START_AT_PORT;

var ErrorResponse = require('../../lib/objects/ErrorResponse.js');

describe('Before stuff', () => {
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The cases', () => {
    describe('Case #0 - try to run PvE without cloud code', () => {
        var unicorn;

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
        it('Should try to begin pve', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(500);

                expect(body).to.deep.equal(new ErrorResponse(654, `Some PVE functions are not implemented`));

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.beginSimple', null, unicorn, callbackFn);
        });
    });

    describe('The stuff', () => {
        it('Should do some stuff', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = true;
        });

    });
    describe('Case #1', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        var unicorn;

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
        it('Should require cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/case1/pveInit.js')
                .requireAsCloudFunction('./cloudFunctions/case1/pveAct.js')
                .requireAsCloudFunction('./cloudFunctions/case1/pveFinalize.js')
                ._reinitCloudFunctions(done);
        });

        var turnsToFinish;

        it('Should begin pve', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('turnsToFinish');
                expect(body.turnsToFinish).to.be.within(50, 100);

                turnsToFinish = body.turnsToFinish;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.beginSimple', null, unicorn, callbackFn);
        });
        it('Should do {turnsToFinish - 1} acts', done => {
            function doAct(n){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ okay: true });

                    if(++n === turnsToFinish - 1){
                        done();
                    } else {
                        doAct(n);
                    }
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pve.actSimple', null, { anyway: 'no interest' }, unicorn, callbackFn);
            }

            doAct(0);
        });
        it('Should make final pve act', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ over: true });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pve.actSimple', null, { anyway: 'no interest' }, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = false;
        });
        it('Should list pve battles and see 1 entry', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.l.length).to.be.equal(1);
                expect(body.l[0].dsp).to.deep.equal({ iAmThe: 'law' });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = true;
        });
    });
    describe('Case #2', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        var unicorn;

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
        it('Should require cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/case2/pveInit.js')
                .requireAsCloudFunction('./cloudFunctions/case2/pveAct.js')
                .requireAsCloudFunction('./cloudFunctions/case2/pveFinalize.js')
                ._reinitCloudFunctions(done);
        });

        var turnsToFinish;

        it('Should begin pve', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('turnsToFinish');
                expect(body.turnsToFinish).to.be.within(50, 100);

                turnsToFinish = body.turnsToFinish;

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.beginSimple', null, unicorn, callbackFn);
        });
        it('Should do {turnsToFinish - 1} acts', done => {
            function doAct(n){
                let callbackFn = (err, response, body) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.deep.equal({ okay: true });

                    if(++n === turnsToFinish - 1){
                        done();
                    } else {
                        doAct(n);
                    }
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pve.actSimple', null, { anyway: 'no interest' }, unicorn, callbackFn);
            }

            doAct(0);
        });
        it('Should make final pve act', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ over: true });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pve.actSimple', null, { anyway: 'no interest' }, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = false;
        });
        it('Should list pve battles and see no entry', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body.l).to.deep.equal([]);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.listBattles', null, unicorn, callbackFn);
        });
        it('A little trick', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = true;
        });
    });
    describe('Case #3', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        var unicorn;

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
        it('Should require cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/case3/pveInit.js')
                .requireAsCloudFunction('./cloudFunctions/case3/pveAct.js')
                .requireAsCloudFunction('./cloudFunctions/case3/pveFinalize.js')
                ._reinitCloudFunctions(done);
        });
        it('Should try to begin pve', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal({ youShallNot: 'pass!' });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.beginSimple', null, unicorn, callbackFn);
        });
    });
    describe('Case #4', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        var unicorn;

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
        it('Should require cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/case4/pveInit.js')
                .requireAsCloudFunction('./cloudFunctions/case4/pveAct.js')
                .requireAsCloudFunction('./cloudFunctions/case4/pveFinalize.js')
                ._reinitCloudFunctions(done);
        });
        it('Should begin pve', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('turnsToFinish');
                expect(body.turnsToFinish).to.be.within(50, 100);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.beginSimple', null, unicorn, callbackFn);
        });
        it('Should try to make pve act', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(400);

                expect(body).to.deep.equal({ youShallNot: 'pass!' });

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pve.actSimple', null, { anyway: 'no interest' }, unicorn, callbackFn);
        });
    });
    describe('Case #5', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        var unicorn;

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
        it('Should require cloud functions', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/case5/pveInit.js')
                .requireAsCloudFunction('./cloudFunctions/case5/pveAct.js')
                .requireAsCloudFunction('./cloudFunctions/case5/pveFinalize.js')
                .requireAsCloudFunction('./cloudFunctions/case5/checkBattleDebts.js')
                ._reinitCloudFunctions(done);
        });
        it('Should checkForDebts', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ hasDebts: false });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.checkBattleDebts', null, unicorn, callbackFn);
        });
        it('Should begin pve', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('turnsToFinish');
                expect(body.turnsToFinish).to.be.within(50, 100);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pve.beginSimple', null, unicorn, callbackFn);
        });
        it('Should checkForDebts again', done => {
            let callbackFn = (err, response, body) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.deep.equal({ hasDebts: true });

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.checkBattleDebts', null, unicorn, callbackFn);
        });
    });

    describe('The stuff', () => {
        it('Should do some stuff', () => {
            goblinBase.authoritarianConfig.disallowDirectProfileExposure = false;
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