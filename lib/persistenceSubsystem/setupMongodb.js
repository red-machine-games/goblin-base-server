'use strict';

module.exports = {
    setupConnection,
    dbIsConnected: () => _dbIsConnected()
};

const log = require('../../index.js').getGoblinBase().logsHook;

var _dbIsConnected;

function setupConnection(dbAddress, autoIndex, poolSize, w, j, wtimeout, callback) {
    var async = require('async'),
        MongoClient = require('mongodb').MongoClient;

    var mongoClient,
        database;

    function doInit(){
        let callbackFn = (err, client) => {
            if(err){
                log.error(err);
                callback(err);
            } else {
                mongoClient = client;
                database = mongoClient.db();
                _dbIsConnected = database.serverConfig.isConnected.bind(database.serverConfig);
                terminateStuff();
            }
        };

        MongoClient.connect(dbAddress, {
            poolSize, w, j, wtimeout,
            autoReconnect: true,
            reconnectTries: Number.POSITIVE_INFINITY,
            forceServerObjectId: false,
            serializeFunctions: false,
            useNewUrlParser: true
        }, callbackFn);
    }
    function terminateStuff(){
        var onTerminate = () =>
            mongoClient.close(() =>
                log.info('Mongodb default connection disconnected through app termination'));
        process.on('SIGINT', onTerminate);    // From terminal
        process.on('SIGTERM', onTerminate);   // From system
        initDaos();
    }
    function initDaos(){
        async.series([
            cb => require('./dao/account.js').init(database, autoIndex, cb),
            cb => require('./dao/atomicAct.js').init(database, autoIndex, cb),
            cb => require('./dao/battle.js').init(database, autoIndex, cb),
            cb => require('./dao/okPurchase.js').init(database, autoIndex, cb),
            cb => require('./dao/profile.js').init(database, autoIndex, cb),
            cb => require('./dao/pveBattle.js').init(database, autoIndex, cb),
            cb => require('./dao/receipt.js').init(database, autoIndex, cb),
            cb => require('./dao/record.js').init(database, autoIndex, cb),
            cb => require('./dao/sequenceCounter.js').init(database, autoIndex, cb),
            cb => require('./dao/ticket.js').init(database, autoIndex, cb),
            cb => require('./dao/vkPurchase.js').init(database, autoIndex, cb),
        ], callback);
    }

    doInit();
}