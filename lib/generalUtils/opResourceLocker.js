'use strict';

module.exports = {
    init,
    getLock,
    returnLock
};

const log = require('../../index.js').getGoblinBase().logsHook;

const INT32_MAX = 2147483647,
    MAX_LOCK_TIME_MS = 7500,
    LOCK_WAIT_TIMEOUT_MS = 2000;

var _ = require('lodash'),
    murmurhash = require('murmurhash');

var opClients = require('../operativeSubsystem/opClients.js');

var ErrorResponse = require('../objects/ErrorResponse.js');

var opSubscriber,
    lockWaitings = {},
    bustlerBuffer = {};

const CHANNEL_NAME = 'rs-lk';

class LockedResources{
    constructor(cat, resources, resourcesStr, lockKey){
        this.cat = cat;
        this.resources = resources;
        this.resourcesStr = resourcesStr;
        this.lockKey = lockKey;
    }
    includes(what){
        if(!_.isString(what)){
            what = what + '';
        }
        return Array.isArray(this.resources) ? _.includes(this.resources, what) : this.resources === what;
    }
    listResources(){
        return Array.isArray(this.resources) ? this.resources.map(e => +e) : [+this.resources];
    }
}
class ResourceLockWaiting{
    constructor(resources, lockKey, callback, deathTimer){
        this.resources = resources;
        this.lockKey = lockKey;
        this.callback = callback;
        this.deathTimer = deathTimer;
    }
}

function init(){
    opSubscriber = opClients.getResourceLockerListenerClient();
    opSubscriber.getRedis().on('message', opHandleMessage);
    opSubscriber.getRedis().subscribe(CHANNEL_NAME);
}

function opHandleMessage(ch, msg){
    if(ch === CHANNEL_NAME){
        let waitingsh = msg.split(';');
        for(let i = 0 ; i < waitingsh.length ; i++){
            let waiting = lockWaitings[waitingsh[i]];
            if(waiting){
                delete lockWaitings[waiting.lockKey];
                clearTimeout(waiting.deathTimer);
                getLockImplementation(_.now(), waiting.resources, waiting.lockKey, waiting.callback);
            } else {
                let bustler = bustlerBuffer[waitingsh[i]];
                if(bustler){
                    bustler.v = true;
                }
            }
        }
    }
}
function getLock(resources, callback){
    var now = _.now(),
        lockKey;

    function checkResources(){
        if(resources){
            resources = Array.isArray(resources) ? resources.map(e => e + '') : resources + '';
            generateLockKey();
        } else {
            callback(new ErrorResponse(841, 'Invalid resources to lock'), null)
        }
    }
    function generateLockKey(){
        var part1 = murmurhash.v3(process.pid + '1' + now, _.random(0, INT32_MAX)).toString(32),
            part2 = murmurhash.v3(process.pid + '2' + now, _.random(0, INT32_MAX)).toString(32);

        lockKey = `${part1}-${part2}`;
        getLockImplementation(now, resources, lockKey, callback);
    }

    checkResources();
}
function getLockImplementation(now, resources, lockKey, callback){
    var resourcesStr = Array.isArray(resources) ? resources.join(';') : resources;

    function tryToGetResourceLock(){
        let callbackFn = (err, response) => {
            if(err){
                log.error('OP Error', { code: 830, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(830, 'OP Error'), null);
            } else if(response === '1'){
                callback(null, new LockedResources(now, resources, resourcesStr, lockKey));
            } else if(response === '0'){
                let bustler = bustlerBuffer[lockKey];
                if(bustler){
                    clearTimeout(bustler.dt);
                    delete bustlerBuffer[lockKey];
                    if(bustler.v){
                        tryToGetResourceLock();
                    } else {
                        doWaitForResource();
                    }
                } else {
                    doWaitForResource();
                }
            }
        };

        var bustlerDeathTimer = setTimeout(() => {
            delete bustlerBuffer[lockKey];
        }, LOCK_WAIT_TIMEOUT_MS);
        bustlerBuffer[lockKey] = { dt: bustlerDeathTimer, v: false };
        opClients.getResourceLockerClient().getResourcesLock([resourcesStr, lockKey, MAX_LOCK_TIME_MS], callbackFn);
    }
    function doWaitForResource(){
        var deathTimer = setTimeout(() => {
            delete lockWaitings[lockKey];
            callback(new ErrorResponse(344, 'Failed to acquire resource lock'), null);
        }, LOCK_WAIT_TIMEOUT_MS);

        lockWaitings[lockKey] = new ResourceLockWaiting(resources, lockKey, callback, deathTimer);
    }

    tryToGetResourceLock();
}
function returnLock(theLock, callback){
    var now = _.now();

    function checkTheLock(){
        if(theLock instanceof LockedResources){
            if(theLock.cat + MAX_LOCK_TIME_MS < now){
                callback(new ErrorResponse(345, 'This lock has rotted'));
            } else {
                doReturnLock();
            }
        } else {
            callback(new ErrorResponse(356, 'Invalid locker'));
        }
    }
    function doReturnLock(){
        let callbackFn = err => {
            if(err){
                log.error('OP Error', { code: 651, err: { code: err.code, command: err.command, message: err.message } });
                callback(new ErrorResponse(651, 'OP Error'));
            } else {
                callback(null);
            }
        };

        opClients.getResourceLockerClient().returnResourcesLock([theLock.resourcesStr, theLock.lockKey], callbackFn);
    }

    checkTheLock();
}