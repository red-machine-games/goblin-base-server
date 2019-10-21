'use strict';

var expect = require('chai').expect,
    async = require('async');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('../utils/testUtils.js');

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

    it('Should require cloud functions', done => {
        goblinBase
            .requireAsCloudFunction('./cloudFunctions/createNewProfile.js')
            .requireAsCloudFunction('./cloudFunctions/mmWithRealPlayer.js')
            .requireAsCloudFunction('./cloudFunctions/readProfileData.js')
            .requireAsCloudFunction('./cloudFunctions/setSingleRecordForMm.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpAutoCloseHandler.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpCheckGameOver.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpConnectionHandler.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpGameOverHandler.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpGeneratePayload.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpInitGameplayModel.js')
            .requireAsCloudFunction('./cloudFunctions/pvp/pvpTurnHandler.js')
            ._reinitCloudFunctions(done);
    });

    it('Should force set zero occupation for gameroom', done => {
        let callbackFn = err => {
            expect(err).to.be.a('null');

            done();
        };

        opClients.getGameplayRoomClient().getRedis().set('the_occupation', 0, callbackFn);
    });

    var ipAddress;

    it('Should add room to matchmaking by hand', done => {
        let callbackFn = err => {
            expect(err).to.be.a('null');

            done();
        };

        ipAddress = gameplayRoom._getIpAddress();
        opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, 3000, '-1', 0], callbackFn);
    });

    it('Should wait some time to refresh', done => setTimeout(done, 10000));
    it('Room occupation and same info in mm should be equal "pairsCapacity"', done => {
        let callbackFn = (err, responses) => {
            expect(err).to.be.a('null');
            expect(responses.every(e => +e === goblinBase.pvpConfig.pairsCapacity)).to.be.equal(true);

            done();
        };

        async.series([
            cb => opClients.getMatchmakingClient().getRedis().zscore('grooms', ipAddress, cb),
            cb => opClients.getGameplayRoomClient().getRedis().get('the_occupation', cb)
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