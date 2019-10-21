'use strict';

const log = require('../../index.js').getGoblinBase().logsHook;

var validate = require('./utils/validateConfigs.js');

class RedisConfig{
    constructor(){
        this.mainWebApp = {};
        this.gameroomApp = {};

        this.isUp = false;
    }
    checkValidate(){
        validate.isNotNullOrUndefined(this.mainWebApp.sessions, 'Session redis client');
        validate.isNotNullOrUndefined(this.mainWebApp.service, 'Service redis client');
        validate.isNotNullOrUndefined(this.mainWebApp.maintenance, 'Maintenance redis client');
        validate.isNotNullOrUndefined(this.mainWebApp.resourceLocker, 'Resource locker redis client');

        function validateRedisClient(header){
            if(this.mainWebApp[header]){
                try {
                    validate.isIpAddress(this.mainWebApp[header].host, `${header}.host`);
                } catch(err){
                    log.warn(err);
                }
                validate.isNumber(this.mainWebApp[header].port, `${header}.port`, 1, 65535);
                validate.isNumber(this.mainWebApp[header].db, `${header}.db`, 0, 256);
                if(this.mainWebApp[header].password){
                    validate.isString(this.mainWebApp[header].password, `${header}.password`, 1);
                }
            }
        }

        validateRedisClient.call(this, 'sessions');
        validateRedisClient.call(this, 'matchmaking');
        validateRedisClient.call(this, 'records');
        validateRedisClient.call(this, 'simpleGameplay');
        validateRedisClient.call(this, 'service');
        validateRedisClient.call(this, 'maintenance');
        validateRedisClient.call(this, 'resourceLocker');
        validateRedisClient.call(this, 'gameplayRoom');

        this.isUp = true;
    }
    setupSessionsClient(host, port, opts){
        var _newConfig = { host, port };
        _newConfig.db = opts.db || 0;
        if(opts.password != null){
            _newConfig.password = opts.password;
        }
        this.mainWebApp.sessions = _newConfig;
        return this;
    }
    setupMatchmakingClient(host, port, opts){
        var _newConfig = { host, port };
        _newConfig.db = opts.db || 0;
        if(opts.password != null){
            _newConfig.password = opts.password;
        }
        this.mainWebApp.matchmaking = _newConfig;
        this.gameroomApp.matchmaking = _newConfig;
        return this;
    }
    setupLeaderboardClient(host, port, opts){
        var _newConfig = { host, port };
        _newConfig.db = opts.db || 0;
        if(opts.password != null){
            _newConfig.password = opts.password;
        }
        this.mainWebApp.records = _newConfig;
        return this;
    }
    setupSimpleGameplayClient(host, port, opts){
        var _newConfig = { host, port };
        _newConfig.db = opts.db || 0;
        if(opts.password != null){
            _newConfig.password = opts.password;
        }
        this.mainWebApp.simpleGameplay = _newConfig;
        return this;
    }
    setupServiceClient(host, port, opts){
        var _newConfig = { host, port };
        _newConfig.db = opts.db || 0;
        if(opts.password != null){
            _newConfig.password = opts.password;
        }
        this.mainWebApp.service = _newConfig;
        return this;
    }
    setupMaintenanceClient(host, port, opts){
        var _newConfig = { host, port };
        _newConfig.db = opts.db || 0;
        if(opts.password != null){
            _newConfig.password = opts.password;
        }
        this.mainWebApp.maintenance = _newConfig;
        return this;
    }
    setupResourceLockerClient(host, port, opts){
        var _newConfig = { host, port };
        _newConfig.db = opts.db || 0;
        if(opts.password != null){
            _newConfig.password = opts.password;
        }
        this.mainWebApp.resourceLocker = _newConfig;
        this.gameroomApp.resourceLocker = _newConfig;
        return this;
    }
    setupPvpRoomClient(host, port, opts){
        var _newConfig = { host, port };
        _newConfig.db = opts.db || 0;
        if(opts.password != null){
            _newConfig.password = opts.password;
        }
        this.gameroomApp.gameplayRoom = _newConfig;
        return this;
    }
}

module.exports = RedisConfig;