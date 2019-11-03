'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('../utils/testUtils.js');

const START_AT_HOST = require('../testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do some stuff', () => {
        gameplayRoom = require('../../lib/features/realtimePvp/gameplayRoom.js');
    });
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The case', () => {
    var cachedMatchmakingStrategy;

    it('Should do some stuff', () => {
        cachedMatchmakingStrategy = goblinBase.matchmakingConfig.strategy;
        goblinBase.matchmakingConfig.strategy = 'open';
    });

    it('Should add cloud functions', done => {
        goblinBase
            .requireAsCloudFunction('./cloudFunctions/mmSearchOpponent.js')
            .requireAsCloudFunction('./cloudFunctions/mmSearchOpponentNope.js')
            .requireAsCloudFunction('./cloudFunctions/setTheRecordsForMm.js')
            ._reinitCloudFunctions(done);
    });

    var unicorns = [], gClientIds = [], gClientSecrets = [];

    _(2).times(n => {
        it(`Should create new account #${n + 1}`, done => {
            let callbackFn = (err, response, body, _unicorn) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                expect(body).to.have.property('unicorn');

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

    it('Should call function setTheRecordsForMm', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.setTheRecordsForMm', null, unicorns[0], callbackFn);
    });

    var roomOccupation;

    it('Should get room occupation by hand ¯\\_(ツ)_/¯', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.a('null');

            roomOccupation = +response;
            expect(roomOccupation).to.be.equal(goblinBase.pvpConfig.pairsCapacity);

            done();
        };

        opClients.getGameplayRoomClient().getOccupation([goblinBase.pvpConfig.pairsCapacity], callbackFn);
    });
    it('Should add room to matchmaking by hand', done => {
        let callbackFn = err => {
            expect(err).to.be.a('null');

            done();
        };

        var ipAddress = gameplayRoom._getIpAddress();
        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, 3000, '-1', roomOccupation], callbackFn);
    });

    it('First player should unsuccessfully try to find opponent', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.a('null');
            expect(response.statusCode).to.be.equal(200);

            expect(body).to.have.property('ts');

            var lpColdResponse = goblinBase.matchmakingConfig.numericConstants.longPollingColdResponseAfterMs;

            expect(body.ts).to.be.within(lpColdResponse, lpColdResponse + 16);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmSearchOpponentNope', null, unicorns[0], callbackFn);
    });
    it('Both players should successfully find each other', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            var body1 = responses[0][1],
                body2 = responses[1][1];

            expect(body1).to.have.property('ts');
            expect(body1.ts).to.be.below(30);

            expect(body2).to.have.property('ts');
            expect(body2.ts).to.be.below(30);

            done();
        };

        async.parallel([
            cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmSearchOpponent', null, unicorns[0], cb),
            cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.mmSearchOpponent', null, unicorns[1], cb)
        ], callbackFn);
    });

    it('Should undo some stuff', () => {
        goblinBase.matchmakingConfig.strategy = cachedMatchmakingStrategy;
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