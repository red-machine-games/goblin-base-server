'use strict';

module.exports = {
    checkMaintenance,
    setTheMaintenance,
    pullOffMaintenance
};

const log = require('../../index.js').getGoblinBase().logsHook;

var _ = require('lodash');

const LAZY_WAIT_MS = 5000,
    MAINTENANCE_REGEXP = /[a-zA-Z0-9.*_]+/;

var opClients = require('../operativeSubsystem/opClients.js');

var ErrorResponse = require('../objects/ErrorResponse.js');

var lazyTimeouts = {};

function checkMaintenance(req, res, next){
    if(_.isEmpty(req.path)){
        next();
    } else {
        let pathLastPart = _.last(req.path.split('/')),
            now = _.now(),
            mcheck = lazyTimeouts[pathLastPart];
        if(!mcheck || mcheck.check + LAZY_WAIT_MS < now){
            let callbackFn = (err, response) => {
                if(!mcheck){
                    mcheck = lazyTimeouts[pathLastPart] = {}
                }
                mcheck.check = now;
                if(err){
                    log.error('OP Error', { code: 962, err: { code: err.code, command: err.command, message: err.message } });
                } else if(response === '1'){
                    mcheck.pass = false;
                    return res.code(503).send(new ErrorResponse(963, 'Under maintenance now!'));
                }
                mcheck.pass = true;
                next();
            };

            opClients.getMaintenanceClient().scanMaintenance([pathLastPart], callbackFn);
        } else if(mcheck.pass){
            next();
        } else {
            res.code(503).send(new ErrorResponse(963, 'Under maintenance now!'));
        }
    }
}
function setTheMaintenance(forUri, callback){
    let callbackFn = err => {
        if(err){
            log.error('OP Error', { code: 964, err: { code: err.code, command: err.command, message: err.message } });
            callback(new ErrorResponse(964, 'OP Error'));
        } else {
            callback(null);
        }
    };

    if(MAINTENANCE_REGEXP.test(forUri)){
        opClients.getMaintenanceClient().getRedis().set(forUri, '1', callbackFn);
    } else {
        callback(new ErrorResponse(965, '"forUri" does not match "MAINTENANCE_REGEXP"'));
    }
}
function pullOffMaintenance(callback){
    let callbackFn = err => {
        if(err){
            log.error('OP Error', { code: 966, err: { code: err.code, command: err.command, message: err.message } });
            callback(new ErrorResponse(966, 'OP Error'));
        } else {
            callback(null);
        }
    };

    opClients.getMaintenanceClient().getRedis().flushdb(callbackFn);
}