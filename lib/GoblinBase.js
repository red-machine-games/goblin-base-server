'use strict';

const DEFAULT_API_PREFIX = 'api/v0/';

var _ = require('lodash');

var WorkloadControlConfig = require('./config/WorkloadControlConfig.js'),
    MatchmakingConfig = require('./config/MatchmakingConfig.js'),
    AccountsConfig = require('./config/AccountsConfig.js'),
    ProfilesConfig = require('./config/ProfilesConfig.js'),
    AuthoritarianConfig = require('./config/AuthoritarianConfig.js'),
    LeaderboardsConfig = require('./config/LeaderboardsConfig.js'),
    TicketsConfig = require('./config/TicketsConfig.js'),
    CloudFunctionsConfig = require('./config/CloudFunctionsConfig.js'),
    SimplePveConfig = require('./config/SimplePveConfig.js'),
    CloudFunctionsExtension = require('./config/CloudFunctionsExtension.js'),
    PvpConfig = require('./config/PvpConfig.js'),
    PlatformConfig = require('./config/PlatformConfig.js'),
    MobileReceiptValidationConfig = require('./config/MobileReceiptValidationConfig.js'),
    VkInappValidationConfig = require('./config/VkInappValidationConfig.js'),
    OkInappValidationConfig = require('./config/OkInappValidationConfig.js'),
    LogsHook = require('./config/LogsHook.js'),
    DatabaseConfig = require('./config/DatabaseConfig.js'),
    StatsdOutputConfig = require('./config/StatsdOutputConfig.js'),
    CorsConfig = require('./config/CorsConfig.js'),
    RequireCloudFunction = require('./config/RequireCloudFunction.js'),
    VkCredentials = require('./config/VkCredentials.js'),
    OkCredentials = require('./config/OkCredentials.js'),
    FacebookCredentials = require('./config/FacebookCredentials.js'),
    AppStoreCredentials = require('./config/AppStoreCredentials.js');

var ErrorResponse = require('./objects/ErrorResponse.js');

class GoblinBase{
    constructor(){
        require('./generalUtils/underscoreUtils.js');

        this.workloadControl = undefined;
        this.matchmakingConfig = undefined;
        this.accountsConfig = undefined;
        this.profilesConfig = undefined;
        this.authoritarianConfig = undefined;
        this.leaderboardsConfig = undefined;
        this.ticketsConfig = undefined;
        this.cloudFunctionsConfig = undefined;
        this.simplePveConfig = undefined;
        this.pvpConfig = undefined;
        this.mobileReceiptValidationConfig = undefined;
        this.vkInappValidationConfig = undefined;
        this.okInappValidationConfig = undefined;
        this.logsHook = new LogsHook({});
        this.logsCloudFunctionsHook = new LogsHook({});
        this.databaseConfig = undefined;
        this.redisConfig = undefined;
        this.statsdOutputConfig = undefined;
        this.cloudFunctionsExtensions = undefined;

        this.vkCredentials = undefined;
        this.okCredentials = undefined;
        this.facebookCredentials = undefined;
        this.googlePlayCredentials = undefined;
        this.appStoreCredentials = undefined;

        this.platforms = [];
        this.requireCloudFunctions = [];
        this.requestOrderValidation = true;
        this.platformPlusVersionCheck = true;
        this.runWebApp = true;

        this._stopped = false;
        this._globalNowTimeDelta = 0;
    }
    includeWorkloadControl(opts={}){
        this.workloadControl = new WorkloadControlConfig(opts);
        return this;
    }
    includeMatchmaking(opts={}){
        this.matchmakingConfig = new MatchmakingConfig(opts);
        return this;
    }
    includeAccounts(opts={}){
        this.accountsConfig = new AccountsConfig(opts);
        return this;
    }
    includeProfiles(opts={}){
        this.profilesConfig = new ProfilesConfig(opts);
        return this;
    }
    includeAuthoritarian(opts={}){
        this.authoritarianConfig = new AuthoritarianConfig(opts);
        return this;
    }
    includeLeaderboards(opts={}){
        this.leaderboardsConfig = new LeaderboardsConfig(opts);
        return this;
    }
    includeTickets(opts={}){
        this.ticketsConfig = new TicketsConfig(opts);
        return this;
    }
    includeCloudFunctions(opts={}) {
        this.cloudFunctionsConfig = new CloudFunctionsConfig(opts);
        this.cloudFunctionsExtensions = [];
        return this;
    }
    extendCloudFunctions(methodName, methodItself){
        if(!this.cloudFunctionsExtensions){
            throw new ErrorResponse(1091, 'Cloud functions are not configured');
        }
        this.cloudFunctionsExtensions.push(new CloudFunctionsExtension(methodName, methodItself));
        return this;
    }
    includeSimplePve(opts={}){
        this.simplePveConfig = new SimplePveConfig(opts);
        return this;
    }
    includePvp(opts={}){
        this.pvpConfig = new PvpConfig(opts);
        return this;
    }
    addPlatform(opts={}){
        this.platforms.push(new PlatformConfig(opts));
        return this;
    }
    includeMobileReceiptValidation(opts={}){
        this.mobileReceiptValidationConfig = new MobileReceiptValidationConfig(opts);
        return this;
    }
    includeVkInappValidation(inappItems=[]){
        this.vkInappValidationConfig = new VkInappValidationConfig(arguments);
        return this;
    }
    includeOkInappValidation(inappItems=[]){
        this.okInappValidationConfig = new OkInappValidationConfig(arguments);
        return this;
    }
    hookLogs(opts={}){
        this.logsHook = new LogsHook(opts);
        return this;
    }
    hookCloudFunctionsLogs(opts={}){
        this.logsCloudFunctionsHook = new LogsHook(opts);
        return this;
    }
    configureDatabase(opts={}){
        this.databaseConfig = new DatabaseConfig(opts);
        return this;
    }
    configureRedis(redisConfig={}){
        redisConfig.checkValidate();
        this.redisConfig = redisConfig;
        return this;
    }
    includeStatsdOutput(opts={}){
        this.statsdOutputConfig = new StatsdOutputConfig(opts);
        return this;
    }
    addVkCredentials(opts={}){
        this.vkCredentials = new VkCredentials(opts);
        return this;
    }
    addOkCredentials(opts={}){
        this.okCredentials = new OkCredentials(opts);
        return this;
    }
    addFacebookCredentials(opts={}){
        this.facebookCredentials = new FacebookCredentials(opts);
        return this;
    }
    addGooglePlayCredentials(googlePlayCredentials){
        this.googlePlayCredentials = googlePlayCredentials;
        return this;
    }
    addAppStoreCredentials(opts={}){
        this.appStoreCredentials = new AppStoreCredentials(opts);
        return this;
    }
    requireAsCloudFunction(thePath){
        if(!this.cloudFunctionsConfig){
            throw new ErrorResponse(866, 'Cloud functions are not configured');
        }

        var path = require('path'),
            pathToThatFile = path.isAbsolute(thePath) ? thePath : path.join(path.dirname(_.callerAbsolutePath()), thePath);

        this.requireCloudFunctions.push(new RequireCloudFunction(pathToThatFile));
        return this;
    }
    disableRequestOrderValidation(){
        this.requestOrderValidation = false;
        return this;
    }
    disablePlatformPlusVersionCheck(){
        this.platformPlusVersionCheck = false;
        return this;
    }
    enableNodeCors(opts={}){
        this.cors = new CorsConfig(opts);
        return this;
    }
    dontRunMainWebapp(){
        this.runWebApp = false;
        return this;
    }
    start(port, host, apiPrefix, callback=()=>{}){
        function checkIntegrity(){
            var configsToGo = [];
            if(!this.accountsConfig){
                configsToGo.push('Accounts config is the must');
            }
            if(!this.profilesConfig){
                configsToGo.push('Profiles config is the must');
            }
            if(!this.databaseConfig){
                configsToGo.push('Database config is the must');
            }
            if(!this.redisConfig || !this.redisConfig.isUp){
                configsToGo.push('Redis config is the must');
            }
            if(this.matchmakingConfig && (!this.redisConfig.mainWebApp.matchmaking || !this.redisConfig.mainWebApp.records)){
                configsToGo.push('If matchmaking included - matchmaking and leaderboards redis client is the must');
            }
            if(this.leaderboardsConfig && !this.redisConfig.mainWebApp.records){
                configsToGo.push('If leaderboards included - leaderboards redis client is the must');
            }
            if(this.simplePveConfig && !this.redisConfig.mainWebApp.simpleGameplay){
                configsToGo.push('If simple PvE included - simpleGameplay redis client is the must');
            }
            if(this.pvpConfig && !this.redisConfig.gameroomApp.gameplayRoom){
                configsToGo.push('If realtime PvP included - pvp room redis client is the must');
            }
            if(this.mobileReceiptValidationConfig && (!this.googlePlayCredentials || !this.googlePlayCredentials.isUp) && (!this.appStoreCredentials || !this.appStoreCredentials.isUp)){
                configsToGo.push('You must configure at least Google Play or App Store credentials to use mobile receipt validation');
            }
            if(this.vkInappValidationConfig && !this.vkCredentials){
                configsToGo.push('VK credentials are the must if using VK inapp validation');
            }
            if(this.okInappValidationConfig && !this.okCredentials){
                configsToGo.push('OK credentials are the must if using OK inapp validation');
            }
            if(!this.platforms.length){
                configsToGo.push('You must configure at least 1 platform');
            }
            if(!!this.platforms.find(e => e.header === 'webvk') && !this.vkCredentials){
                configsToGo.push('You must add VK credentials to use web VK platform');
            }
            if(!!this.platforms.find(e => e.header === 'webok') && !this.okCredentials){
                configsToGo.push('You must add OK credentials to use web OK platform');
            }
            if(!!this.platforms.find(e => e.header === 'webfb') && !this.facebookCredentials){
                configsToGo.push('You must add Facebook credentials to use Facebook platform');
            }
            if(this.runWebApp && (!port || !host)){
                configsToGo.push('Host and port are the must for main web app');
            }

            if(configsToGo.length){
                let errMessage = `Goblin Base won't run: ${configsToGo.join(', ')}`;
                this.logsHook.fatal(errMessage);
                callback(new ErrorResponse(124, errMessage));
            } else {
                checkEngine.call(this);
            }
        }
        function checkEngine(){
            let callbackFn = result => {
                if (result.message.type === 'success') {
                    doRunServer.call(this);
                } else {
                    let errMessage = `Goblin Base won't run: ${result.message.text} | expected ${result.packages[0].expectedVersion} , found ${result.packages[0].foundVersion}`;
                    this.logsHook.fatal(errMessage);
                    callback(new ErrorResponse(125, errMessage));
                }
            };

            require('check-engine')(require('path').join(__dirname, '../package.json')).then(callbackFn);
        }
        function doRunServer(){
            let callbackFn = err => {
                if (err) {
                    this.logsHook.fatal(err);
                    callback(err);
                } else {
                    this.logsHook.info(`Goblin Base Server run : v${require('../package').version}`);
                    this.requireCloudFunctions = [];
                    callback(null);
                }
            };

            if(!this.runWebApp){
                port = null;
                host = null;
            }
            require('./serverItlsef.js').run(port, host, /*apiPrefix || */DEFAULT_API_PREFIX, callbackFn);
        }

        checkIntegrity.call(this);

        return this;
    }
    _setTheMaintenance(forUri, callback){
        require('./webMiddleware/maintenanceManager.js').setTheMaintenance(forUri, callback);
    }
    _pullOffMaintenance(callback){
        require('./webMiddleware/maintenanceManager.js').pullOffMaintenance(callback);
    }
    _reinitCloudFunctions(callback){
        let callbackFn = err => {
            this.requireCloudFunctions = [];
            callback(err);
        };

        require('./serverItlsef.js').rerunCloudFunctions(callbackFn);
    }
    _stop(callback){
        this._stopped = true;
        require('./serverItlsef.js').close(callback);
    }
    _clearDatabases(callback){
        require('async').parallel([
            cb => require('./persistenceSubsystem/dao/account.js').deleteMany({}, cb),
            cb => require('./persistenceSubsystem/dao/battle.js').deleteMany({}, cb),
            cb => require('./persistenceSubsystem/dao/pveBattle.js').deleteMany({}, cb),
            cb => require('./persistenceSubsystem/dao/okPurchase.js').deleteMany({}, cb),
            cb => require('./persistenceSubsystem/dao/profile.js').deleteMany({}, cb),
            cb => require('./persistenceSubsystem/dao/receipt.js').deleteMany({}, cb),
            cb => require('./persistenceSubsystem/dao/record.js').deleteMany({}, cb),
            cb => require('./persistenceSubsystem/dao/sequenceCounter.js').deleteMany({}, cb),
            cb => require('./persistenceSubsystem/dao/ticket.js').deleteMany({}, cb),
            cb => require('./persistenceSubsystem/dao/vkPurchase.js').deleteMany({}, cb),
            cb => require('./persistenceSubsystem/dao/atomicAct.js').deleteMany({}, cb),
            cb => require('./operativeSubsystem/opClients.js').getSessionsClient().getRedis().flushall(cb)
        ], callback);
    }
}

module.exports = GoblinBase;