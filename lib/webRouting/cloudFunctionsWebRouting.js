'use strict';

const GET = 'GET',
    POST = 'POST';

module.exports = {
    register
};

const BODY_LIMIT = 2097152;

var _ = require('lodash');

var profiles = require('../features/accountsAndProfiles/profiles.js');

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

function register(app, apiPrefix){
    if(goblinBase.cloudFunctionsConfig){
        app.route({
            method: GET,
            url: `/${apiPrefix}act.:act`,
            preHandler: [
                measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(goblinBase.cloudFunctionsConfig.customSession),
                requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _callCloudFunction
        });
        app.route({
            method: POST,
            url: `/${apiPrefix}act.:act`,
            bodyLimit: BODY_LIMIT,
            preHandler: [
                bodyIsTheMust, measureRequest, checkMaintenance, platformPlusVersionCheck,
                sessionKeeper.getSession(goblinBase.cloudFunctionsConfig.customSession),
                requestOrderValidation, hmacValidation, bgRefresher
            ],
            handler: _callCloudFunction
        });

        _.each(require('../features/cloudFunctions/CF_Code.js').listCloudFunctions(), act =>
            log.info(`Register new route: /${apiPrefix}act.${act} (GET and POST)`));
    }
}

function _callCloudFunction(req, res){
    let callbackFn = (code, response) => {
        res.code(code).send(response);
    };

    profiles.runCloudFunction(
        req.sessionObject, req.params.act, _.extend(req.query, req.body),
        req.clientPlatform, req.clientVersion, callbackFn
    );
}