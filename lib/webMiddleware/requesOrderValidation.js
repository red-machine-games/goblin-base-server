'use strict';

module.exports = {
    theCheck,
    getSequence
};

const goblinBase = require('../../index.js').getGoblinBase(),
    log = goblinBase.logsHook;

const UNICORN_HEADER = require('./sessionKeeper.js').UNICORN_HEADER;
const REQUEST_ORDER_HEADER = require('./hmacValidation.js').HMAC_REQUEST_SEQUENCE_HEADER;

var _ = require('lodash');

var opClients = require('../operativeSubsystem/opClients.js');

let ErrorResponse = require('../objects/ErrorResponse.js');

function theCheck(req, res, next) {
    function checkCurrentRequest() {
        var requestOrderHeader = _.getPropIgnoreCase(req.headers, REQUEST_ORDER_HEADER, 'WRONG'),
            currentRequestOrder = parseInt(requestOrderHeader);

        if(isNaN(currentRequestOrder)){
            justUnlockSession(400, new ErrorResponse(876, `HMAC: ${REQUEST_ORDER_HEADER} is totally wrong!`));
        } else if ((req.sessionObject && parseInt(req.sessionObject.requestSequence) !== currentRequestOrder) ||
                (!req.sessionObject && currentRequestOrder !== 0)){
            justUnlockSession(400, new ErrorResponse(408, 'HMAC: sequence mismatch'));
        } else {
            req.order = currentRequestOrder;
            next();
        }
    }
    function justUnlockSession(code, response){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 409, err: { code: err.code, command: err.command, message: err.message } });
            }
            res.code(code).send(response);
        };

        if(req.sessionObject){
            opClients.getSessionsClient().getRedis().del(`sexp:${req.sessionObject.unicorn}`, err => callbackFn(err));
        } else {
            res.code(code).send(response);
        }
    }

    if (goblinBase.requestOrderValidation) {
        checkCurrentRequest();
    } else {
        next();
    }
}
function getSequence(req, res) {
    function getSequenceFromOp() {
        let unicorn = _.getPropIgnoreCase(req.headers, UNICORN_HEADER);

        if (unicorn) {
            let callbackFn = (err, response) => {
                if (err) {
                    res.code(500).send(new ErrorResponse(933, err));
                } else {
                    res.code(200).send({ sequence: _.parseIntOrNull(response) });
                }
            };

            opClients.getSessionsClient().getRedis().hget(`sess:${unicorn}`, 'rsq', callbackFn);
        } else {
            res.code(401).send(new ErrorResponse(934, 'No unicorn'));
        }
    }

    if (goblinBase.requestOrderValidation) {
        getSequenceFromOp();
    } else {
        res.code(400).send(new ErrorResponse(935, 'This function is disabled'));
    }
}