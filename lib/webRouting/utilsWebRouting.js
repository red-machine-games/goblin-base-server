'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

const goblinBase = require('../../index.js').getGoblinBase();

var purchaseValidation = require('../features/socialNetworksAndInapps/storePurchaseValidation.js');

const BODY_LIMIT = 2097152;

var _ = require('lodash');

var platformPlusVersionCheck = require('../webMiddleware/platformPlusVersionCheck.js').doCheck,
    sessionKeeper = require('../webMiddleware/sessionKeeper.js'),
    requestOrderValidation = require('../webMiddleware/requesOrderValidation.js').theCheck,
    hmacValidation = require('../webMiddleware/hmacValidation.js').theCheck,
    bgRefresher = require('../webMiddleware/bgRefresher.js').theDo,
    measureRequest = require('../generalUtils/metricsForStatsD.js').measureRequest,
    checkMaintenance = require('../webMiddleware/maintenanceManager.js').checkMaintenance,
    requestOrderGetter = require('../webMiddleware/requesOrderValidation.js').getSequence,
    bodyIsTheMust = require('../webMiddleware/sometimesBodyIsTheMust.js');

var ErrorResponse = require('../objects/ErrorResponse.js');

function register(app, apiPrefix){
    function getGetServerTime(){
        app.route({
            method: GET,
            url: `/${apiPrefix}utils.getServerTime`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: (__, res) => res.send(`${_.now()}`)
        });
        getGetSequence();
    }
    function getGetSequence(){
        app.route({
            method: GET,
            url: `/${apiPrefix}utils.getSequence`,
            preHandler: [
                platformPlusVersionCheck, sessionKeeper.pingSession
            ],
            handler: requestOrderGetter
        });
        postPurchaseValidation();
    }
    function postPurchaseValidation(){
        app.route({
            method: POST,
            url: `/${apiPrefix}utils.purchaseValidation`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(), requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _purchaseValidation
        });
        getPing();
    }
    function getPing(){
        app.route({
            method: GET,
            url: `/${apiPrefix}utils.ping`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck, sessionKeeper.pingSession
            ],
            handler: (__, res) => res.code(200).send()
        });
    }

    getGetServerTime();
}

function _purchaseValidation(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    if(!goblinBase.mobileReceiptValidationConfig){
        return res.code(501).send(new ErrorResponse(457, 'Purchase validation not configured'));
    }
    if(_.isEmpty(req.body.receipt)){
        return res.code(400).send(new ErrorResponse(650, 'No receipt'));
    }
    purchaseValidation.isValidSeparateRoute(req.sessionObject.pid, req.query.platform, req.body.receipt, callbackFn);
}