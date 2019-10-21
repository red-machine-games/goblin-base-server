'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

var vkJobs = require('../features/socialNetworksAndInapps/vkJobs.js');

const BODY_LIMIT = 262144;

var formbodyParser = require('fastify-formbody');

const goblinBase = require('../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

var platformPlusVersionCheck = require('../webMiddleware/platformPlusVersionCheck.js').doCheck,
    sessionKeeper = require('../webMiddleware/sessionKeeper.js'),
    requestOrderValidation = require('../webMiddleware/requesOrderValidation.js').theCheck,
    hmacValidation = require('../webMiddleware/hmacValidation.js').theCheck,
    bgRefresher = require('../webMiddleware/bgRefresher.js').theDo,
    measureRequest = require('../generalUtils/metricsForStatsD.js').measureRequest,
    checkMaintenance = require('../webMiddleware/maintenanceManager.js').checkMaintenance,
    bodyIsTheMust = require('../webMiddleware/sometimesBodyIsTheMust.js');

var ErrorResponse = require('../objects/ErrorResponse.js');

function register(app, apiPrefix){
    function postServiceCallback(){
        app.route({
            method: POST,
            url: `/${apiPrefix}vkJobs.vkServiceCallback`,
            bodyLimit: BODY_LIMIT,
            preHandler: [bodyIsTheMust, measureRequest],
            handler: _vkServiceCallback
        });
        getListPurchases();
    }
    function getListPurchases(){
        app.route({
            method: GET,
            url: `/${apiPrefix}vkJobs.listPurchases`,
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
            url: `/${apiPrefix}vkJobs.consumePurchase`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _consumePurchase
        });
    }

    postServiceCallback();
}

function _vkServiceCallback(req, res){
    let callbackFn = (code, response) => {
        if(code !== 200){
            log.info(`VK.com backend <- ${code}${response ? ` ${JSON.stringify(response)}` : ''}`);
        }
        res.code(code).send(response);
    };

    log.info(`VK.com backend: ${JSON.stringify(req.body)} ~ (${req.get('Content-Type')})`);
    if(!goblinBase.vkInappValidationConfig || !goblinBase.vkInappValidationConfig){
        callbackFn(400, { error: { error_code: 11, critical: true } });
    } else if(req.body.notification_type === 'get_item' || req.body.notification_type === 'get_item_test'){
        vkJobs.itemInfoCallback(req.body, callbackFn);
    } else if(req.body.notification_type === 'order_status_change' || req.body.notification_type === 'order_status_change_test'){
        vkJobs.orderStatusChangeCallback(req.body, callbackFn);
    } else {
        let error = { error_code: 11, critical: true };
        log.error('VK Error', { code: 276, err: error });
        callbackFn(400, { error });
    }
}
function _listPurchases(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.vkCredentials){
        return res.code(501).send(new ErrorResponse(501, 'No VK credentials'));
    }
    vkJobs.listPurchases(req.sessionObject, req.query.offset, req.query.limit, callbackFn);
}
function _consumePurchase(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.vkCredentials){
        return res.code(501).send(new ErrorResponse(502, 'No VK credentials'));
    }
    if(goblinBase.authoritarianConfig && goblinBase.authoritarianConfig.disallowDirectProfileExposure){
        return res.code(403).send(new ErrorResponse(503, 'Not allowed!'));
    }
    vkJobs.consumePurchase(req.sessionObject, parseInt(req.query.purchasenum), callbackFn);
}