'use strict';

const TEST_PREFS = require('./!testPrefs.json');

const START_AT_HOST = TEST_PREFS.START_AT_HOST, START_AT_PORT = TEST_PREFS.START_AT_PORT,
    VK_TEST_CLIENT_ID = TEST_PREFS.VK_TEST_CLIENT_ID, VK_TEST_CLIENT_SECRET = TEST_PREFS.VK_TEST_CLIENT_SECRET;

module.exports = {
    START_AT_HOST,
    START_AT_PORT,

    VK_TEST_CLIENT_ID,
    VK_TEST_CLIENT_SECRET
};

var GoblinBase = require('../index.js');

const MONGODB_HOST = TEST_PREFS.MONGODB_HOST, MONGODB_PORT = TEST_PREFS.MONGODB_PORT, MONGODB_DATABASE_NAME = TEST_PREFS.MONGODB_DATABASE_NAME,
    REDIS_HOST = TEST_PREFS.REDIS_HOST, REDIS_PORT = TEST_PREFS.REDIS_PORT;

describe('Run Goblin Base Server', () => {
    it('Should run', done => {
        GoblinBase.getGoblinBase()
            .configureDatabase({ connectionUrl: `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE_NAME}` })
            .configureRedis(new GoblinBase.RedisConfig()
                .setupSessionsClient(REDIS_HOST, REDIS_PORT, { db: 0 })
                .setupLeaderboardClient(REDIS_HOST, REDIS_PORT, { db: 1 })
                .setupMatchmakingClient(REDIS_HOST, REDIS_PORT, { db: 2 })
                .setupPvpRoomClient(REDIS_HOST, REDIS_PORT, { db: 3 })
                .setupSimpleGameplayClient(REDIS_HOST, REDIS_PORT, { db: 4 })
                .setupServiceClient(REDIS_HOST, REDIS_PORT, { db: 5 })
                .setupMaintenanceClient(REDIS_HOST, REDIS_PORT, { db: 6 })
                .setupResourceLockerClient(REDIS_HOST, REDIS_PORT, { db: 7 })
            )
            .includeAccounts({ lastActionTimeout: 1000 * 2 })
            .includeProfiles()
            .includeTickets({ ticketLifetime: 1000 * 2 })
            .includeLeaderboards({
                whitelistSegments: [
                    'segma', 'segmb', 'segm1', 'segm2', 'segm3', 'segm4', 'segm5', 'segm6', 'segm7',
                    'segm8', 'segm9', 'segm10', 'segm11', 'deposit', 'hello', 'world', 'nope'
                ],
                numericConstants: { allRefreshTimeout: 10 }
            })
            .includeMatchmaking({
                strategy: 'predefined',
                limitLeaderboardRadius: 1,
                limitMmr: 0,
                searchBothSides: true,
                maxSearchRanges: 4,
                rememberAsyncOpponentMs: 2000,
                numericConstants: {
                    longPollingColdResponseAfterMs: 1000 * 3,
                    longPollingDestroyAfterMs: 1000 * 25,
                    timeForSearchMs: 1000 * 6,
                    timeForAcceptanceMs: 1000 * 6,
                    refreshStatsReloadingMs: 1000,
                    refreshStatsBatchSize: 100,
                    gameroomBookingTtl: 1000 * 6,
                    playerInGameroomTtl: 1000 * 15
                }
            })
            .includePvp({
                apiPrefix: 'v0/',
                displayHost: '127.0.0.1',
                physicalPort: 7331,
                displayPortWs: 7331,
                shareIPAddress: true,
                pairsCapacity: 1,
                numericConstants: {
                    heartbeatIntervalMs: 500,
                    timeToConnectPairMs: 1000 * 5,
                    checkSocketsEveryMs: 1000 * 2,
                    connectionLockTtlMs: 1000 * 5,
                    messageLockTtlMs: 1000,
                    pairInGameTtlMs: 1000 * 10,
                    socketTtlMs: 1000 * 3,
                    timeToProcessMessageMs: 1000 * 2,
                    unpausedGameTtlMs: 1000 * 8,
                    pausedPairTtlMs: 1000 * 7,
                    pausedTimedoutPairInactivityMs: 1000 * 2,
                    refreshStatsReloadingMs: 1000,
                    refreshStatsBatchSize: 100,
                    refreshOccupationReloadingMs: 1000,
                    absoluteMaximumGameplayTtlMs: 1000 * 60 * 30
                }
            })
            .includeSimplePve()
            .includeAuthoritarian()
            .includeMobileReceiptValidation()
            .addGooglePlayCredentials(new GoblinBase.GooglePlayCredentials().serviceAccount('abc', '123', 'com.vegetation.glance'))
            .includeCloudFunctions({ enableSetTimeout: true, allowToPushInitContext: true, resources: { balance: { hello: 'world' } } })
            .requireAsCloudFunction('./defaultCloudFunctions/pvpAutoCloseHandler.js')
            .requireAsCloudFunction('./defaultCloudFunctions/pvpCheckGameOver.js')
            .requireAsCloudFunction('./defaultCloudFunctions/pvpConnectionHandler.js')
            .requireAsCloudFunction('./defaultCloudFunctions/pvpDisconnectionHandler.js')
            .requireAsCloudFunction('./defaultCloudFunctions/pvpGameOverHandler.js')
            .requireAsCloudFunction('./defaultCloudFunctions/pvpGeneratePayload.js')
            .requireAsCloudFunction('./defaultCloudFunctions/pvpInitGameplayModel.js')
            .requireAsCloudFunction('./defaultCloudFunctions/pvpTurnHandler.js')
            .addPlatform({ header: GoblinBase.PLATFORMS.STANDALONE })
            .addPlatform({ header: GoblinBase.PLATFORMS.WEB_VK })
            .addPlatform({ header: GoblinBase.PLATFORMS.WEB_OK })
            .addPlatform({ header: GoblinBase.PLATFORMS.WEB_FB })
            .addPlatform({ header: GoblinBase.PLATFORMS.IOS, hmacSecretsMap: { ['0.0.2']: 'default' } })
            .addPlatform({ header: GoblinBase.PLATFORMS.ANDROID, hmacSecretsMap: { ['0.0.0']: 'default' } })
            .addVkCredentials({ clientId: VK_TEST_CLIENT_ID, clientSecret: VK_TEST_CLIENT_SECRET, useTokenAsId: true })
            .addOkCredentials({ applicationPublicKey: '123456', applicationSecretKey: 'abcdef', useTokenAsId: true })
            .addFacebookCredentials({ clientId: 123, clientSecret: 'abcdef', useTokenAsId: true })
            .hookLogs({ info: console.log, warn: console.log, error: console.error, fatal: console.error })
            .start(START_AT_PORT, START_AT_HOST, 'api/', done);
    });
});
describe('Test utils', () => {
    require('./utils-contract.js');
});
describe('Test accounts', () => {
    require('./accounts-contract.js');
});
describe('Test profiles', () => {
    require('./profiles-contract.js');
});
describe('Test tickets', () => {
    require('./tickets-contract.js');
});
describe('Test leaderboards', () => {
    require('./leaderboards-contract.js');
});
describe('Test middleware', () => {
    require('./middleware-contract.js');
});
describe('Test matchmaking', () => {
    require('./matchmaking-contract.js');
});
describe('Test gameroom', () => {
    require('./gameroom-contract.js');
});
describe('Test pvp player versus self', () => {
    require('./playerVersusBot-contract.js');
});
describe('Issue: floating OP Error on setReady', () => {
    require('./issue_94.js');
});
describe('Issue: multiple acceptMatch and 315 OP Error', () => {
    require('./issue_92.js');
});
describe('Issue: weird case with 358 OP Error', () => {
    require('./issue_95.js');
});
describe('Issue: switch websocket message listener on model established', () => {
    require('./issue_107.js');
});
describe('Issue: test Redis possible leaks (additional quality test)', () => {
    require('./issue_108.js');
});
describe('Issue: bad behavior of matchmaking when has players with same records', () => {
    require('./issue_84.js');
});
describe('Check: No multiple sessions on one account', () => {
    require('./issue_119.js');
});
describe('Auto-defeat and manual surrender', () => {
    require('./autoDefeatAndSurrender-contract.js');
});
describe('Surrender with bot', () => {
    require('./surrenderWithBot-contract.js');
});
describe('Matchmaking with mmr limit', () => {
    require('./matchmaking-on-mmr-contract.js');
});
describe('Cloud function createNewProfile', () => {
    require('./createNewProfileCloudFunction-contract');
});
describe('Cloud functions PvE', () => {
    require('./cloudFunctionsPve-contract');
});
describe('Ratings cloud functions', () => {
    require('./ratingsCloudFunctions-contract');
});
describe('Non repetitive matchmaking', () => {
    require('./nonRepetitiveMatchmaking-contract.js');
});
describe('Matchmaking with user-defined strategy and ranges', () => {
    require('./matchmakingWithUserDefinedStrategy-contract.js');
});
describe('Only matchmaking (no pvp)', () => {
    require('./onlyMatchmakingNoPvp-contract.js');
});
describe('Test pingSession', () => {
    require('./pingSession-contract.js');
});
describe('matchmaking cloud functions and initialization context', () => {
    require('./matchmakingCloudFunctionsAndInitContext-contract');
});
describe('Issue: 658 Get or create profile first (actually not an issue)', () => {
    require('./issue_170.js');
});
describe('Lets check that atomics are good at outer ops failures', () => {
    // There are some error emitters around the code - they react on special global variables.
    // They must be uncommented to make this work
    require('./atomicsAreGoodAtFailures-contract');
});
describe('Lets check that atomics are good at outer ops failures: part deux', () => {
    // There are some error emitters around the code - they react on special global variables.
    // They must be uncommented to make this work
    require('./atomicsAreGoodAtFailures2-contract');
});
describe('Validating inapps inside of custom code', () => {
    require('./purchaseValidationInsideOfCloudFunctions-contract');
});
describe('Modify profiles, records and bje for multiple players from cloud function', () => {
    require('./multipleProfilesAndBjePersistWithCloudFunction-contract');
});
describe('Gameplay room pvp with cloud functions', () => {
    require('./gameroomWithCloudFunctions-contract');
});
describe('Operative resources locker', () => {
    require('./opResourceLocker-contract.js');
});
describe('New profile mutation', () => {
    require('./newProfileMutation-contract/index');
});
describe('Cloud function relock', () => {
    require('./cloudFunctionRelock-contract');
});
describe('PVP with cloud functions and hand selected opponents', () => {
    require('./pvpWithCloudCodeAndHandSelectedOpponents-contract');
});
describe('Running cloud functions from another cloud functions', () => {
    require('./runningCloudFunctionFromCloudFunctions-contract');
});
describe('Gameroom reconnect with force extrusion', () => {
    require('./issue_206')
});
describe('Standalone OK auth', () => {
    require('./standaloneOkAuth-contract.js');
});
describe('onGetProfile cloud function', () => {
    require('./onGetProfileCloudFunction-contract');
});
describe('Limited life of records', () => {
    require('./issue_212.js');
});
describe('Issue: Maybe redis memory leak on matchmaking (PVP ROOM FOR REAL)', () => {
    require('./issue_267');
});
describe('Issue: gameroom "the_occupation" is leaking', () => {
    require('./issue_270');
});
describe('Gameplay websocket message direct resend contract', () => {
    require('./gameplayWebsocketDirectResend-contract');
});
describe('Making no-profile social linkage and bi-login contract', () => {
    require('./issue_285.js');
});
describe('Authoritarian matchmaking, onMatchmaking cloud function contract', () => {
    require('./authoritarianMatchmaking-contract');
});
describe('Pvp paused ping message contract', () => {
    require('./pvpPausedPingMessage-contract');
});
describe('Test that all indexes are good (Stress-testing indexes by fact)', () => {
    require('./goodIndexes-contract.js');
});