'use strict';

module.exports = {
    run,
    rerunCloudFunctions,
    close
};

const goblinBase = require('../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const FORMBODY_LIMIT = 262144;

var app;

var ErrorResponse = require('./objects/ErrorResponse.js');

function run(port, host, apiPrefix, callback){
    const goblinBase = require('../index.js').getGoblinBase(),
        log = goblinBase.logsHook;

    app = require('fastify')({ logger: false });

    function initParts(){
        var CF_CRUD = require('./features/cloudFunctions/CF_CRUD.js');

        function setupEmergencySignalHandlers(){
            const EMERGENCY_TIMEOUT_MS = 10000;
            process.on('SIGINT', () => setTimeout(() => process.exit(-800), EMERGENCY_TIMEOUT_MS));   // From terminal
            process.on('SIGTERM', () => setTimeout(() => process.exit(-800), EMERGENCY_TIMEOUT_MS));  // From system
            setupMongodb();
        }
        function setupMongodb(){
            let callbackFn = err => {
                if(err){
                    log.fatal(err);
                    callback(new ErrorResponse(12, 'Setting up Mongodb error'));
                } else {
                    setupRedis();
                }
            };

            require('./persistenceSubsystem/setupMongodb.js').setupConnection(
                goblinBase.databaseConfig.connectionUrl,
                goblinBase.databaseConfig.autoIndex,
                goblinBase.databaseConfig.poolSize,
                goblinBase.databaseConfig.writeConcern,
                goblinBase.databaseConfig.journalConcern,
                goblinBase.databaseConfig.wtimeout,
                callbackFn
            );
        }
        function setupRedis(){
            function redisWebApp(){
                if(host && port){
                    require('./operativeSubsystem/opClients.js').init(goblinBase.redisConfig.mainWebApp, redisGpr);
                } else {
                    redisGpr();
                }
            }
            function redisGpr(){
                if(goblinBase.pvpConfig){
                    require('./operativeSubsystem/opClients.js').init(goblinBase.redisConfig.gameroomApp, setupOpResourceLocker);
                } else {
                    setupOpResourceLocker();
                }
            }

            redisWebApp();
        }
        function setupOpResourceLocker(){
            require('./generalUtils/opResourceLocker.js').init();
            setupRecords();
        }
        function setupRecords(){
            if(goblinBase.leaderboardsConfig){
                let callbackFn = err => {
                    if(err){
                        log.fatal(err);
                        callback(new ErrorResponse(388, 'Setting up records error'));
                    } else {
                        setupMatchmaking();
                    }
                };

                require('./features/leaderboards/leaderboards.js').initFromPersistence(callbackFn);
            } else {
                setupMatchmaking();
            }
        }
        function setupMatchmaking(){
            if(goblinBase.leaderboardsConfig && goblinBase.matchmakingConfig){
                require('./features/matchmaking/matchmaking.js').init();
            }
            setupStorePurchaseValidation();
        }
        function setupStorePurchaseValidation(){
            if(goblinBase.mobileReceiptValidationConfig){
                let callbackFn = err => {
                    if(err){
                        log.fatal(err);
                        callback(err);
                    } else {
                        initBgRefresher();
                    }
                };

                require('./features/socialNetworksAndInapps/storePurchaseValidation.js').init(callbackFn);
            } else {
                initBgRefresher();
            }
        }
        function initBgRefresher(){
            require('./webMiddleware/bgRefresher.js').init();
            windupCloudFunctions();
        }
        function windupCloudFunctions(){
            if(goblinBase.requireCloudFunctions && goblinBase.requireCloudFunctions.length){
                let callbackFn = err => {
                    if(err){
                        log.fatal(err);
                        callback(err);
                    } else {
                        setupCloudFunctionsExtensions();
                    }
                };

                CF_CRUD.requireCloudFunctions(goblinBase.requireCloudFunctions, callbackFn);
            } else {
                setupGameplayRoom();
            }
        }
        function setupCloudFunctionsExtensions(){
            if(goblinBase.cloudFunctionsExtensions && goblinBase.cloudFunctionsExtensions.length){
                CF_CRUD.setupExtensions(goblinBase.cloudFunctionsExtensions);
            }
            setupGameplayRoom();
        }
        function setupGameplayRoom(){
            if(goblinBase.pvpConfig){
                let callbackFn = err => {
                    if(err){
                        log.fatal(err);
                        callback(err);
                    } else {
                        initApp();
                    }
                };

                require('./features/realtimePvp/gameplayRoom.js').initAndRun(callbackFn);
            } else {
                initApp();
            }
        }

        setupEmergencySignalHandlers();
    }
    function initApp(){
        if(goblinBase.workloadControl){
            let toobusy = require('toobusy-js');

            toobusy.maxLag(goblinBase.workloadControl.eventLoopMaxLag);
            toobusy.interval(goblinBase.workloadControl.eventLoopCheckInterval);
            toobusy.onLag(currentLag => log.warn(`Event loop lag detected! Latency: ${currentLag} ms`));

            app.use((req, res, next) => {
                if (toobusy()) {
                    res.status(503).send(new ErrorResponse(592, 'Too busy now!'));
                } else {
                    next();
                }
            });
        }
        if(goblinBase.cors){
            app.register(require('fastify-cors'), goblinBase.cors);
        }

        app.register(require('fastify-helmet'), {
            xssFilter: {},
            hsts: { maxAge: 1000 * 60 * 60 * 24 * 365 },
            hidePoweredBy: {}, ieNoOpen: {}, noSniff: {}
        });

        app.register(require('fastify-formbody'), { bodyLimit: FORMBODY_LIMIT });

        initMetrics();
    }
    function initMetrics(){
        let callbackFn = (err, response) => {
            if(err) {
                log.error(err);
                callback(err);
            } else {
                if(!response){
                    log.warn('Metrics for StatsD not initialized: no pm2 or configs(includeStatsdOutput)');
                }
                initRouting();
            }
        };

        require('./generalUtils/metricsForStatsD.js').init(callbackFn);
    }
    function initRouting(){
        if(goblinBase.runWebApp){
            require('./webRouting/accountsWebRouting.js').register(app, apiPrefix);
            require('./webRouting/battlesWebRouting.js').register(app, apiPrefix);
            require('./webRouting/cloudFunctionsWebRouting.js').register(app, apiPrefix);
            require('./webRouting/leaderboardsWebRouting.js').register(app, apiPrefix);
            require('./webRouting/matchmakingWebRouting.js').register(app, apiPrefix);
            require('./webRouting/okJobsWebRouting.js').register(app, apiPrefix);
            require('./webRouting/profilesWebRouting.js').register(app, apiPrefix);
            require('./webRouting/pvpMatchmakingWebRouting.js').register(app, apiPrefix);
            require('./webRouting/simplePveWebRouting.js').register(app, apiPrefix);
            require('./webRouting/ticketsWebRouting.js').register(app, apiPrefix);
            require('./webRouting/utilsWebRouting.js').register(app, apiPrefix);
            require('./webRouting/vkJobsWebRouting.js').register(app, apiPrefix);

            app.use(require('./webMiddleware/headersControl.js'));
            require('./webMiddleware/errorsControl.js').register(app);

            tryToRunWebServer();
        } else {
            signalHandlers();
        }
    }
    function tryToRunWebServer(){
        if(host && port){
            app.listen(port, host, (err, address) => {
                if(err){
                    log.fatal(err);
                    callback(err);
                } else {
                    signalHandlers();
                    log.info(`Server start on ${address}`);
                }
            });
        } else {
            signalHandlers();
        }
    }
    function signalHandlers(){
        process.on('SIGINT', () => close(() => process.exit(0)));   // From terminal
        process.on('SIGTERM', () => close(() => process.exit(0)));  // From system
        process.on('uncaughtException', (err, origin) => goblinBase.logsHook.error(err, origin));
        global.appVersion = require('../package.json').version;
        log.info(require('fs').readFileSync(require('path').join(__dirname, 'GoblinBaseServer')).toString());
        callback(null);
    }

    initParts();
}

function rerunCloudFunctions(callback){
    var CF_CRUD = require('./features/cloudFunctions/CF_CRUD.js');

    function windupCloudFunctions(){
        if(goblinBase.requireCloudFunctions && goblinBase.requireCloudFunctions.length){
            let callbackFn = err => {
                if(err){
                    log.fatal(err);
                    callback(err);
                } else {
                    setupCloudFunctionsExtensions();
                }
            };

            CF_CRUD.requireCloudFunctions(goblinBase.requireCloudFunctions, callbackFn);
        } else {
            callback(null);
        }
    }
    function setupCloudFunctionsExtensions(){
        if(goblinBase.cloudFunctionsExtensions && goblinBase.cloudFunctionsExtensions.length){
            CF_CRUD.setupExtensions(goblinBase.cloudFunctionsExtensions);
        }
        callback(null);
    }

    windupCloudFunctions();
}

function close(callback){
    function closeHttp() {
        log.info('Processing exit...');

        let callbackFn = err => {
            if(err){
                log.info('stopTheHttpServer @ Processing exit... ERROR');
                log.fatal(err);
                callback(err);
            } else {
                log.info('stopTheHttpServer @ Processing exit... OK');
                closeGameplayRoom();
            }
        };

        log.info('stopTheHttpServer @ Processing exit...');
        try{
            app.close(callbackFn);
        } catch(err){
            log.info('stopTheHttpServer @ Processing exit... ERROR');
            log.fatal(err);
            callback(err);
        }
    }
    function closeGameplayRoom(){
        let callbackFn = err => {
            if(err){
                log.info('closeGameplayRoom @ Processing exit... ERROR');
                log.error(err);
                callback(err);
            } else {
                log.info('closeGameplayRoom @ Processing exit... OK');
                closeRedisClients();
            }
        };

        log.info('closeGameplayRoom @ Processing exit...');
        if(goblinBase.pvpConfig){
            require('./features/realtimePvp/gameplayRoom.js').shutdown(callbackFn);
        } else {
            log.info('closeGameplayRoom @ Processing exit... NO GAMEPLAY ROOM');
            closeRedisClients();
        }
    }
    function closeRedisClients() {
        log.info('closeRedisClients @ Processing exit...');
        require('./operativeSubsystem/opClients.js').quitAllClients();
        log.info('closeRedisClients @ Processing exit... OK');

        callback(null);
    }

    closeHttp();
}