'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    WebSocket = require('ws');

var goblinBase = require('../index.js').getGoblinBase();

var opClients = require('../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('./utils/testUtils.js');

var ErrorResponse = require('../lib/objects/ErrorResponse.js');

const START_AT_HOST = require('../!testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../!testEntryPoint.js').START_AT_PORT;

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
            .requireAsCloudFunction('./cloudFunctions/mmAllInOne.js')
            .requireAsCloudFunction('./cloudFunctions/mutateProfile.js')
            .requireAsCloudFunction('./cloudFunctions/setFictiveProfileData.js')
            .requireAsCloudFunction('./cloudFunctions/setTheRecordsForMm.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpAutoCloseHandler.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpCheckGameOver.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpConnectionHandler.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpGameOverHandler.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpGeneratePayload.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpInitGameplayModel.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpTurnHandler.js')
            .requireAsCloudFunction('./cloudFunctions/setTheRecordsForMm.js')
            ._reinitCloudFunctions(done);
    });

    var unicorns = [], gClientIds = [], gClientSecrets = [],
        gameroomSeqs = [];

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
        it(`Should post player rating #${n + 1}`, done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.thePost(START_AT_HOST, START_AT_PORT, 'tops.postARecord', {
                value: 1,
                segment: `segma`
            }, null, unicorns[n], callbackFn);
        });
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

    it('Both players should find each other', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            done();
        };

        var body1 = { rgs: [{ from: '-inf', to: '+inf' }] },
            body2 = { rgs: [{ from: '-inf', to: '+inf' }] };
        async.paralle([
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma', strat: 'bylad' }, body1, unicorns[0], cb),
            cb => testUtils.thePost(START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent', { segment: 'segma', strat: 'bylad' }, body2, unicorns[1], cb)
        ], callbackFn);
    });
    it('Both players should accept match', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses[0][0].statusCode).to.be.equal(200);
            expect(responses[1][0].statusCode).to.be.equal(200);

            done();
        };

        async.parallel([
            cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorns[0], cb),
            cb => testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.acceptMatch', null, unicorns[1], cb)
        ], callbackFn);
    });

    it('First player should get stuff again', done => {
        let callbackFn = (err, response) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.be.equal(200);

            done();
        };

        testUtils.thePost(
            START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent',
            { segment: 'segma', strat: 'bylad' }, { rgs: [{ from: '-inf', to: '+inf' }] }, unicorns[0],
            callbackFn
        );
    });
    it('First player should get proper error if trying to start bot search', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.be.equal(400);

            expect(body).to.deep.equal(new ErrorResponse(1000, 'Already in queue'));

            done();
        };

        testUtils.thePost(
            START_AT_HOST, START_AT_PORT, 'pvp.searchForBotOpponent',
            { segment: 'segma', strat: 'byr' }, { rgs: [{ from: '-inf', to: '+inf' }] }, unicorns[0],
            callbackFn
        );
    });
    it('First player should get gameroom address and booking key', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('stat', 'MM: gameroom allocated');
            expect(body).to.have.property('c', 3);
            expect(body).to.have.property('address');
            expect(body).to.have.property('key');

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.checkBattleNoSearch', null, unicorns[0], callbackFn);
    });
    it('First player should drop matchmaking data', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('forReal', true);

            done();
        };

        testUtils.theGet(START_AT_HOST, START_AT_PORT, 'pvp.dropMatchmaking', null, unicorns[0], callbackFn);
    });

    it('First player should start new matchmaking search without problem', done => {
        let callbackFn = (err, response, body) => {
            expect(err).to.be.equal(null);
            expect(response.statusCode).to.equal(200);

            expect(body).to.have.property('stat', 'MM: searching');
            expect(body).to.have.property('c', 0);

            done();
        };

        testUtils.thePost(
            START_AT_HOST, START_AT_PORT, 'pvp.searchForOpponent',
            { segment: 'segma', strat: 'bylad' }, { rgs: [{ from: '-inf', to: '+inf' }] }, unicorns[0],
            callbackFn
        );
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