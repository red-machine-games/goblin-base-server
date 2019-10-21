'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

var okJobs = require('../features/socialNetworksAndInapps/okJobs.js');

var formbodyParser = require('fastify-formbody');

const goblinBase = require('../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

var platformPlusVersionCheck = require('../webMiddleware/platformPlusVersionCheck.js').doCheck,
    sessionKeeper = require('../webMiddleware/sessionKeeper.js'),
    requestOrderValidation = require('../webMiddleware/requesOrderValidation.js').theCheck,
    hmacValidation = require('../webMiddleware/hmacValidation.js').theCheck,
    bgRefresher = require('../webMiddleware/bgRefresher.js').theDo,
    measureRequest = require('../generalUtils/metricsForStatsD.js').measureRequest,
    checkMaintenance = require('../webMiddleware/maintenanceManager.js').checkMaintenance;

var ErrorResponse = require('../objects/ErrorResponse.js');

function register(app, apiPrefix){
    function okServiceCallback(){
        app.route({
            method: GET,
            url: `/${apiPrefix}okJobs.okServiceCallback`,
            preHandler: [measureRequest],
            handler: _okServiceCallback
        });
        getListPurchases();
    }
    function getListPurchases(){
        app.route({
            method: GET,
            url: `/${apiPrefix}okJobs.listPurchases`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _listPurchases
        });
        getConsumePurchase();
    }
    function getConsumePurchase(){
        app.route({
            method: GET,
            url: `/${apiPrefix}okJobs.consumePurchase`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _consumePurchases
        });
    }

    okServiceCallback();
}

function _okServiceCallback(req, res){
    let callbackFn = (code, response) => {
        log.info(`OK.ru backend <- ${code}${response ? ` ${JSON.stringify(response)}` : ''}`);
        res.header('Content-Type', 'application/xml');
        res.code(code).send(response);
    };

    log.info(`OK.ru backend: ${req.query}`);
    okJobs.serviceCallback(req.query, callbackFn);
}
function _listPurchases(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.okCredentials){
        return res.code(501).send(new ErrorResponse(526, 'No OK credentials'));
    }
    okJobs.listPurchases(req.sessionObject, req.query.offset, req.query.limit, callbackFn);
}
function _consumePurchases(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.okCredentials){
        return res.code(501).send(new ErrorResponse(527, 'No OK credentials'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(528, 'Not allowed!'));
    }
    okJobs.consumePurchase(req.sessionObject, parseInt(req.query.purchasenum), callbackFn);
}