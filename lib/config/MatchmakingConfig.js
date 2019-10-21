'use strict';

const DEFAULT_MAX_SEARCH_RANGES = 4,
    DEFAULT_REMEMBER_ASYNC_OPPONENT_MS = 1000 * 60 * 5,
    DEFAULT_STRATEGY = 'open',
    DEFAULT_LIMIT_MMR = 0,
    DEFAULT_LIMIT_LEADERBOARD_RADIUS = 15,
    DEFAULT_SEARCH_BOTH_SIDES = true,
    DEFAULT_BOOKING_KEY_SALT = '7zJ3HxTCdNGacv3uQv3Aq5yHgN2DevFLsxFwpdzvhqrGAqYx',
    DEFAULT_NUMERIC_CONST_LONG_POLLING_COLD_RESPONSE_AFTER_MS = 10 * 1000,
    DEFAULT_NUMERIC_CONST_LONG_POLLING_DESTROY_AFTER_MS = 14 * 1000,
    DEFAULT_NUMERIC_CONST_TIME_FOR_SEARCH_MS = 30 * 1000,
    DEFAULT_NUMERIC_CONST_TIME_FOR_ACCEPTANCE_MS = 30 * 1000,
    DEFAULT_NUMERIC_CONST_REFRESH_STATS_RELOADING_MS = 1000,
    DEFAULT_NUMERIC_CONST_REFRESH_STATS_BATCH_SIZE = 100,
    DEFAULT_NUMERIC_CONST_GAMEROOM_BOOKING_TTL = 5 * 60 * 1000,
    DEFAULT_NUMERIC_CONST_PLAYER_IN_GAMEROOM_TTL = 90 * 1000;

var validate = require('./utils/validateConfigs.js');

class MatchmakingConfig{
    constructor(opts){
        this.maxSearchRanges = opts.maxSearchRanges || DEFAULT_MAX_SEARCH_RANGES;
        this.rememberAsyncOpponentMs = opts.rememberAsyncOpponentMs || DEFAULT_REMEMBER_ASYNC_OPPONENT_MS;
        this.strategy = opts.strategy || DEFAULT_STRATEGY;
        this.limitMmr = opts.limitMmr || DEFAULT_LIMIT_MMR;
        this.limitLeaderboardRadius = opts.limitLeaderboardRadius || DEFAULT_LIMIT_LEADERBOARD_RADIUS;
        this.searchBothSides = opts.searchBothSides != null ? opts.searchBothSides : DEFAULT_SEARCH_BOTH_SIDES;
        this.bookingKeySalt = opts.bookingKeySalt || DEFAULT_BOOKING_KEY_SALT;

        this.numericConstants = {
            longPollingColdResponseAfterMs: DEFAULT_NUMERIC_CONST_LONG_POLLING_COLD_RESPONSE_AFTER_MS,
            longPollingDestroyAfterMs: DEFAULT_NUMERIC_CONST_LONG_POLLING_DESTROY_AFTER_MS,
            timeForSearchMs: DEFAULT_NUMERIC_CONST_TIME_FOR_SEARCH_MS,
            timeForAcceptanceMs: DEFAULT_NUMERIC_CONST_TIME_FOR_ACCEPTANCE_MS,
            refreshStatsReloadingMs: DEFAULT_NUMERIC_CONST_REFRESH_STATS_RELOADING_MS,
            refreshStatsBatchSize: DEFAULT_NUMERIC_CONST_REFRESH_STATS_BATCH_SIZE,
            gameroomBookingTtl: DEFAULT_NUMERIC_CONST_GAMEROOM_BOOKING_TTL,
            playerInGameroomTtl: DEFAULT_NUMERIC_CONST_PLAYER_IN_GAMEROOM_TTL
        };
        if(opts.numericConstants){
            if(opts.numericConstants.longPollingColdResponseAfterMs){
                this.numericConstants.longPollingColdResponseAfterMs = opts.numericConstants.longPollingColdResponseAfterMs;
            }
            if(opts.numericConstants.longPollingDestroyAfterMs){
                this.numericConstants.longPollingDestroyAfterMs = opts.numericConstants.longPollingDestroyAfterMs;
            }
            if(opts.numericConstants.timeForSearchMs){
                this.numericConstants.timeForSearchMs = opts.numericConstants.timeForSearchMs;
            }
            if(opts.numericConstants.timeForAcceptanceMs){
                this.numericConstants.timeForAcceptanceMs = opts.numericConstants.timeForAcceptanceMs;
            }
            if(opts.numericConstants.refreshStatsReloadingMs){
                this.numericConstants.refreshStatsReloadingMs = opts.numericConstants.refreshStatsReloadingMs;
            }
            if(opts.numericConstants.refreshStatsBatchSize){
                this.numericConstants.refreshStatsBatchSize = opts.numericConstants.refreshStatsBatchSize;
            }
            if(opts.numericConstants.gameroomBookingTtl){
                this.numericConstants.gameroomBookingTtl = opts.numericConstants.gameroomBookingTtl;
            }
            if(opts.numericConstants.playerInGameroomTtl){
                this.numericConstants.playerInGameroomTtl = opts.numericConstants.playerInGameroomTtl;
            }
        }

        this._validateIt();
    }
    _validateIt(){
        validate.isNumber(this.maxSearchRanges, 'maxSearchRanges', 1);
        validate.isNumber(this.rememberAsyncOpponentMs, 'rememberAsyncOpponentMs', 0);
        validate.isMatchmakingStrategy(this.strategy, 'strategy');
        validate.isNumber(this.limitMmr, 'limitMmr', 0);
        validate.isNumber(this.limitLeaderboardRadius, 'limitLeaderboardRadius', 0);
        validate.isBoolean(this.searchBothSides, 'searchBothSides');
        validate.isString(this.bookingKeySalt, 'bookingKeySalt', 8, 256);
        validate.isNumber(this.numericConstants.longPollingColdResponseAfterMs, 'numericConstants.longPollingColdResponseAfterMs', 1000);
        validate.isNumber(this.numericConstants.longPollingDestroyAfterMs, 'numericConstants.longPollingDestroyAfterMs', 1000);
        validate.isNumber(this.numericConstants.timeForSearchMs, 'numericConstants.timeForSearchMs', 1000);
        validate.isNumber(this.numericConstants.timeForAcceptanceMs, 'numericConstants.timeForAcceptanceMs', 1000);
        validate.isNumber(this.numericConstants.refreshStatsReloadingMs, 'numericConstants.refreshStatsReloadingMs', 0);
        validate.isNumber(this.numericConstants.refreshStatsBatchSize, 'numericConstants.refreshStatsBatchSize', 1);
        validate.isNumber(this.numericConstants.gameroomBookingTtl, 'numericConstants.gameroomBookingTtl', 1000);
        validate.isNumber(this.numericConstants.playerInGameroomTtl, 'numericConstants.playerInGameroomTtl', 1000);
    }
}

module.exports = MatchmakingConfig;